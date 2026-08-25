export enum LiquidityPattern {
  CREATE = 'fea360.liquidity.create',
  UPDATE_COMMITMENTS_ON_STATUS_CHANGE = 'fea360.liquidity.update.commitments.on.status.change',
}

export enum LiquidityJobQueuePatterns {
  ORDER_ACCEPTED = 'fea360.liquidity.accepted',
  APPLY_LIQUID = 'fea360.liquidity.aply',
  APPLY_LIQUID_BATCH = 'fea360.liquidity.aply.batch',
  GENERATE_AGENT_REPORT = 'fea360.liquidity.agent.report',
  SEND_UPDATE_NOTIFICATIONS = 'fea360.liquidity.send.notifications',
}
