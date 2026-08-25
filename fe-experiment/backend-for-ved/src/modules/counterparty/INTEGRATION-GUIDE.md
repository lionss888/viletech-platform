# Counterparty Registry Integration Guide

This document describes how to integrate the Counterparty Registry with the FormPayment module.

## Overview

The Counterparty Registry tracks approval history for counterparties (suppliers/buyers). When a FormPayment is created with a counterparty reference, the system tracks:
- Which counterparties have been approved
- When they were last approved
- Who approved them (compliance officer)
- Approval comments

The integration points are:
1. **FormPayment Creation** - Link FormPayment to Counterparty
2. **FormPayment Status Change** - Update Counterparty approval status
3. **FormPayment Deletion** - Unlink FormPayment from Counterparty

## Integration Steps

### 1. Install Counterparty Module in FormPayment

In `src/modules/form-payment/form-payment.module.ts`, add:

```typescript
import { CounterpartyModule } from '../counterparty/counterparty.module';

@Module({
  imports: [
    // ... other imports
    CounterpartyModule,
  ],
  // ...
})
export class FormPaymentModule {}
```

### 2. Inject Hook Service in FormPayment Service

In `src/modules/form-payment/service/form-payment.service.ts`:

```typescript
import { CounterpartyFormPaymentHookService } from 'modules/counterparty/service/counterparty-form-payment-hook.service';

@Injectable()
export class FormPaymentService extends BaseService<...> {
  constructor(
    @InjectModel(FormPayment.name) readonly model: PaginateModel<FormPayment>,
    // ... other injections
    private readonly counterpartyHook: CounterpartyFormPaymentHookService,
  ) {
    super();
  }

  // ... rest of service
}
```

### 3. Call Hook in FormPayment Creation

In the `create()` method, after FormPayment is created, call:

```typescript
async create(createData: IFormPaymentCreate): Promise<IFormPayment> {
  // ... existing creation logic

  const form = await super.create(createData);

  // Link to counterparty if provided
  if (createData.counterpartyRef) {
    await this.counterpartyHook.onFormPaymentCreated(form._id, createData.counterpartyRef);
  }

  // ... rest of method
  return form;
}
```

### 4. Call Hook on Status Changes

In `updateByAdmins()` method, after status is updated, call:

```typescript
const updatedForm = await this.updateOne(findData, updateData, options);

// Update counterparty approval if status changed to approved/rejected
if (updatedForm.counterpartyRef && updateData.status) {
  await this.counterpartyHook.onFormPaymentStatusChanged(
    updatedForm._id,
    updatedForm.status,
    updatedForm.counterpartyRef,
    options?.account?.toString(), // compliance officer ID
    updateData.rejectText, // optional comment
  );
}

await this.formPaymentQueue.add(...);
return updatedForm;
```

### 5. Handle Counterparty Selection in DTOs

Update `src/modules/form-payment/dto/form-payment.create.dto.ts`:

```typescript
export class FormPaymentCreateDto {
  // ... existing fields

  @ApiPropertyOptional({ description: 'Counterparty ID from registry' })
  @IsOptional()
  @IsMongoId()
  counterpartyRef?: string;

  @ApiPropertyOptional({ description: 'Selected bank UUID from counterparty' })
  @IsOptional()
  @IsString()
  counterpartyBankUuid?: string;

  @ApiPropertyOptional({ description: 'Selected account UUID from counterparty bank' })
  @IsOptional()
  @IsString()
  counterpartyAccountUuid?: string;
}
```

### 6. Populate Embedded Counterparty from Registry

In the `create()` or `updateFormByUser()` method, when counterpartyRef is provided, populate the embedded `counterparty` field:

```typescript
async create(createData: IFormPaymentCreate): Promise<IFormPayment> {
  // ... validation and setup

  // Populate embedded counterparty field if registry reference provided
  if (createData.counterpartyRef && createData.counterpartyBankUuid && createData.counterpartyAccountUuid) {
    const { bank, account } = await this.counterpartyHook.findBankAndAccount(
      createData.counterpartyRef,
      createData.counterpartyBankUuid,
      createData.counterpartyAccountUuid,
    );

    createData.counterparty = {
      name: 'Populated from counterparty registry',
      bankName: bank.bankName,
      bankCountry: bank.bankCountry,
      bankAddress: bank.bankAddress,
      swiftCode: bank.swiftCode,
      accountNumber: account.accountNumber,
      // ... other fields from bank/account
    };
  }

  // ... rest of creation
}
```

### 7. Display Approval History in API Response

Add approval history to FormPayment read endpoints:

```typescript
async getFormPaymentDetails(id: string): Promise<any> {
  const form = await this.findById(id);

  // Add approval history if counterparty is linked
  let approvalHistory = null;
  if (form.counterpartyRef) {
    approvalHistory = await this.counterpartyHook.getApprovalHistoryForDisplay(form.counterpartyRef);
  }

  return {
    ...form,
    approvalHistory,
  };
}
```

### 8. Auto-Skip External Compliance (NEW REQUIREMENT)

**Business Rule**: If counterparty was approved < 6 months ago, skip external compliance stage automatically after internal compliance approval.

**Integration in FormPaymentService**:

After internal compliance officer approves FormPayment (transitions from `ORGANIZATION_VERIFICATION` stage), check if external compliance can be skipped:

```typescript
async handleInternalComplianceApproval(
  formPaymentId: string,
  complianceOfficerId: string,
): Promise<IFormPayment> {
  // 1. Update FormPayment status after internal compliance approval
  const form = await this.updateOne(
    { _id: formPaymentId },
    {
      status: FormPaymentStatus.ORGANIZATION_APPROVED, // or whatever status comes after internal compliance
      stage: FormPaymentStage.ORGANIZATION_VERIFICATION_COMPLETED,
    },
  );

  // 2. Check if external compliance can be skipped
  const canSkip = await this.counterpartyHook.checkAutoSkipExternalCompliance(
    form.counterpartyRef?.toString(),
  );

  if (canSkip) {
    this.logger.log(
      `Auto-skipping external compliance for FormPayment ${form.number} ` +
      `(counterparty approved < 6 months ago)`,
    );

    // 3. Skip FORM_VERIFICATION stage, go directly to next stage
    await this.updateOne(
      { _id: formPaymentId },
      {
        stage: FormPaymentStage.AGENCY_CONTRACT, // Next stage after FORM_VERIFICATION
        // Add system comment to explain auto-skip
      },
    );

    // 4. Optional: Add system comment
    await this.commentService.create({
      entityType: 'form-payment',
      entityId: formPaymentId,
      text: '✅ Внешний комплаенс пропущен автоматически. Контрагент был проверен менее 6 месяцев назад.',
      isSystemGenerated: true,
    });
  } else {
    this.logger.log(
      `External compliance required for FormPayment ${form.number} ` +
      `(counterparty not recently approved or no counterparty linked)`,
    );

    // Proceed to external compliance stage normally
    await this.updateOne(
      { _id: formPaymentId },
      { stage: FormPaymentStage.FORM_VERIFICATION },
    );
  }

  return form;
}
```

**When to call**:
- After internal compliance officer clicks "Approve" in ORGANIZATION_VERIFICATION stage
- Before transitioning to FORM_VERIFICATION stage
- Logic: Check if counterparty approved < 6 months → if yes, skip to AGENCY_CONTRACT

**Logging**:
```
[FormPaymentService] Auto-skipping external compliance for FormPayment FP-2025-11-05-0042 (counterparty approved < 6 months ago)
[CounterpartyFormPaymentHookService] Auto-skip external compliance enabled for counterparty: 507f1f77... (approved < 6 months ago)
[CounterpartyService] Counterparty 507f1f77... - can skip external compliance: true (months since approval: 2)
```

## Counterparty Registry Endpoints

Once integrated, the following endpoints become available:

### List Counterparties
```
GET /counterparty/list?page=1&limit=20&name=Foreign&country=Germany&lastApprovalStatus=approved
```

### Get Counterparty Details
```
GET /counterparty/:id
```

### Create Counterparty
```
POST /counterparty/create
Body: {
  "clientOrganization": "org-id",
  "name": "Foreign Buyer Ltd",
  "country": "Germany",
  "type": "foreign",
  "banks": [{
    "bankName": "Deutsche Bank",
    "bankCountry": "Germany",
    "swiftCode": "DEUTDE",
    "accounts": [{
      "accountNumber": "DE89370400440532013000",
      "currency": "EUR",
      "isPrimary": true
    }]
  }]
}
```

### Update Counterparty
```
PATCH /counterparty/:id
Body: {
  "legalAddress": "New address",
  "addBanks": [{ ... }],
  "removeBankUuids": ["uuid1", "uuid2"]
}
```

### Delete Counterparty (soft delete)
```
DELETE /counterparty/:id
```

## Migration

Run the migration to aggregate existing counterparties from FormPayments:

```typescript
// In a migration runner
import { CounterpartyMigrationService } from 'src/migrations/counterparty-migration.service';

const migrationService = new CounterpartyMigrationService(counterpartyModel);
await migrationService.runMigration(formPaymentModel, organizationModel);
```

This will:
- Group FormPayments by counterparty (name + country or INN)
- Create Counterparty records
- Link FormPayments to counterparties
- Merge banks with the same SWIFT code
- Set approval status based on FormPayment history

## Key Design Decisions

1. **Backward Compatibility**: The embedded `counterparty` field in FormPayment is kept for backward compatibility. New integrations should use counterpartyRef + counterpartyBankUuid + counterpartyAccountUuid.

2. **6-Month Re-review Rule**: Counterparties approved more than 6 months ago require re-review. This is checked via `getApprovalHistoryIndicator()`.

3. **No Auto-Approval**: The system shows approval history but does NOT automatically approve FormPayments. Compliance officers must still make their own decisions.

4. **Client-Specific**: Each Organization has its own independent counterparty list. The same company might be treated differently by different clients.

## Error Handling

All hook service methods include error handling and logging. If a counterparty operation fails, it logs the error but doesn't fail the FormPayment operation (graceful degradation).

Errors to watch for:
- `NotFoundException` - Counterparty, bank, or account not found
- `BadRequestException` - Invalid counterparty data (duplicate, missing INN for Russian, etc.)
- `ForbiddenException` - Accessing counterparty from different organization

## Testing

Test the integration with:

1. **Create FormPayment with counterparty reference**
   - Verify counterpartyRef/bankUuid/accountUuid are stored
   - Verify FormPayment is added to Counterparty.formPayments

2. **Approve/Reject FormPayment**
   - Verify Counterparty.lastApprovalStatus is updated
   - Verify Counterparty.lastApprovalDate is set
   - Verify FormPayment can be retrieved with approval history

3. **6-Month Rule**
   - Create counterparty with approval > 6 months ago
   - Verify getApprovalHistoryIndicator returns requiresReview=true

4. **Backward Compatibility**
   - Existing FormPayments without counterpartyRef still work
   - Embedded counterparty field still functions

## Future Enhancements

1. **Auto-fill on Selection**: When user selects a counterparty, auto-fill all bank details
2. **Counterparty KYC**: Add separate KYC process for counterparties
3. **Risk Scoring**: Calculate risk score based on approval history
4. **Deduplication Across Clients**: Option to share counterparty data across organizations
5. **Email Notifications**: Notify when counterparty re-review is required
