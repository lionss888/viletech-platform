import { PipelineStage } from 'mongoose';

interface FormStatusConfig {
  pendingStatuses: readonly string[];
  approvedStages: readonly string[];
  rejectedStatuses: readonly string[];
  otherStatuses: readonly string[];
  canceledStatuses: readonly string[];
}

/**
 * Utility class for MongoDB aggregation pipelines used in compliance history.
 * Provides reusable aggregation stages for request statistics and organization data.
 */
export class ComplianceAggregationUtils {
  /**
   * Creates $lookup stage for calculating request statistics per organization.
   * Groups FormPayments by organization and counts by category (pending, approved, rejected, other).
   */
  static buildRequestStatsLookup(statusConfig: FormStatusConfig): PipelineStage {
    const { pendingStatuses, approvedStages, rejectedStatuses, otherStatuses, canceledStatuses } = statusConfig;

    return {
      $lookup: {
        from: 'form-payments',
        let: { orgId: '$_id', orgIdStr: { $toString: '$_id' } },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ['$organization.refOrganizationId', '$$orgId'] },
                  { $eq: ['$organization.refOrganizationId', '$$orgIdStr'] },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              pending: { $sum: { $cond: [{ $in: ['$status', pendingStatuses] }, 1, 0] } },
              approved: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $in: ['$stage', approvedStages] }, { $not: [{ $in: ['$status', canceledStatuses] }] }],
                    },
                    1,
                    0,
                  ],
                },
              },
              rejected: { $sum: { $cond: [{ $in: ['$status', rejectedStatuses] }, 1, 0] } },
              other: { $sum: { $cond: [{ $in: ['$status', otherStatuses] }, 1, 0] } },
            },
          },
        ],
        as: 'requestStats',
      },
    };
  }

  /**
   * Creates $lookup stage for fetching organization status history.
   * Gets the most recent status change record for current organization status.
   */
  static buildStatusHistoryLookup(): PipelineStage {
    return {
      $lookup: {
        from: 'organization-statuses-history',
        let: { orgId: '$_id', currentStatus: '$status' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$organizationId', '$$orgId'] }, { $eq: ['$status', '$$currentStatus'] }],
              },
            },
          },
          { $sort: { createDate: -1 } },
          { $limit: 1 },
        ],
        as: 'statusHistory',
      },
    };
  }

  /**
   * Creates $project stage for organization list view.
   * Includes organization fields + calculated request statistics.
   */
  static buildOrganizationProjection(): PipelineStage {
    return {
      $project: {
        name: 1,
        inn: 1,
        ogrn: 1,
        legalAddress: 1,
        email: 1,
        phone: 1,
        status: 1,
        statusUpdatedAt: { $arrayElemAt: ['$statusHistory.createDate', 0] },
        totalRequests: { $ifNull: [{ $arrayElemAt: ['$requestStats.total', 0] }, 0] },
        approvedCount: { $ifNull: [{ $arrayElemAt: ['$requestStats.approved', 0] }, 0] },
        rejectedCount: { $ifNull: [{ $arrayElemAt: ['$requestStats.rejected', 0] }, 0] },
        pendingCount: { $ifNull: [{ $arrayElemAt: ['$requestStats.pending', 0] }, 0] },
        otherCount: { $ifNull: [{ $arrayElemAt: ['$requestStats.other', 0] }, 0] },
      },
    };
  }

  /**
   * Alias for buildOrganizationProjection (used in different contexts).
   * Returns same projection for clients list.
   */
  static buildClientsListProjection(): PipelineStage {
    return {
      $project: {
        _id: 1,
        name: 1,
        inn: 1,
        status: 1,
        statusUpdatedAt: { $arrayElemAt: ['$statusHistory.createDate', 0] },
        createDate: 1,
        totalRequests: { $ifNull: [{ $arrayElemAt: ['$requestStats.total', 0] }, 0] },
        pendingCount: { $ifNull: [{ $arrayElemAt: ['$requestStats.pending', 0] }, 0] },
        approvedCount: { $ifNull: [{ $arrayElemAt: ['$requestStats.approved', 0] }, 0] },
        rejectedCount: { $ifNull: [{ $arrayElemAt: ['$requestStats.rejected', 0] }, 0] },
        otherCount: { $ifNull: [{ $arrayElemAt: ['$requestStats.other', 0] }, 0] },
      },
    };
  }
}
