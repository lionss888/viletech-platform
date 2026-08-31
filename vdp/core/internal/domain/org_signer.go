package domain

import apperrors "github.com/viletech/vdp/core/pkg/errors"

// SignerPosition matches Nest OrganizationSignerPositionType.
type SignerPosition string

const (
	SignerGeneralDirector        SignerPosition = "general_director"
	SignerExecutiveDirector      SignerPosition = "executive_director"
	SignerManagingDirector       SignerPosition = "managing_director"
	SignerFinanceDirector        SignerPosition = "finance_director"
	SignerCommercialDirector     SignerPosition = "commercial_director"
	SignerLogisticsDirector      SignerPosition = "logistics_director"
	SignerSupplyChainDirector    SignerPosition = "supply_chain_director"
	SignerCustomsCompliance      SignerPosition = "customs_compliance_officer"
	SignerForeignTradeManager    SignerPosition = "foreign_trade_manager"
	SignerImportExportManager    SignerPosition = "import_export_manager"
	SignerChiefAccountant        SignerPosition = "chief_accountant"
	SignerOther                  SignerPosition = "other"
)

// BusinessForm matches Nest OrganizationBusinessFormType.
type BusinessForm string

const (
	BusinessFormOOO  BusinessForm = "ООО"
	BusinessFormOAO  BusinessForm = "ОАО"
	BusinessFormPAO  BusinessForm = "ПАО"
	BusinessFormIP   BusinessForm = "ИП"
	BusinessFormAO   BusinessForm = "АО"
	BusinessFormOCOO BusinessForm = "ОсОО"
	BusinessFormTOO  BusinessForm = "ТОО"
	BusinessFormFZKO BusinessForm = "ФЗКО"
)

// ValidSignerPosition reports whether p is a known enum value (empty allowed).
func ValidSignerPosition(p SignerPosition) bool {
	if p == "" {
		return true
	}
	switch p {
	case SignerGeneralDirector, SignerExecutiveDirector, SignerManagingDirector,
		SignerFinanceDirector, SignerCommercialDirector, SignerLogisticsDirector,
		SignerSupplyChainDirector, SignerCustomsCompliance, SignerForeignTradeManager,
		SignerImportExportManager, SignerChiefAccountant, SignerOther:
		return true
	default:
		return false
	}
}

// ValidBusinessForm reports whether f is a known enum value (empty allowed).
func ValidBusinessForm(f BusinessForm) bool {
	if f == "" {
		return true
	}
	switch f {
	case BusinessFormOOO, BusinessFormOAO, BusinessFormPAO, BusinessFormIP,
		BusinessFormAO, BusinessFormOCOO, BusinessFormTOO, BusinessFormFZKO:
		return true
	default:
		return false
	}
}

// OrgProfilePatch updates organization card fields used in generated PDFs (not Account login).
type OrgProfilePatch struct {
	Name                string
	INN                 string
	Country             string
	FullName            string
	BusinessForm        BusinessForm
	Phone               string
	Email               string
	SignerName          string
	SignerPosition      SignerPosition
	SignerOtherPosition string
	LegalAddress        string
	OGRN                string
	KPP                 string
}

// ValidateOrgProfilePatch checks enum fields and signer_other when position is other.
func ValidateOrgProfilePatch(p OrgProfilePatch) error {
	if !ValidBusinessForm(p.BusinessForm) {
		return apperrors.New(apperrors.ErrCodeValidation, "invalid business_form")
	}
	if !ValidSignerPosition(p.SignerPosition) {
		return apperrors.New(apperrors.ErrCodeValidation, "invalid signer_position")
	}
	if p.SignerPosition == SignerOther && p.SignerOtherPosition == "" {
		return apperrors.New(apperrors.ErrCodeValidation, "signer_other_position required when signer_position is other")
	}
	return nil
}
