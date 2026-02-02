import { DatasetType } from '../detector'
import { AccBim360Adapter } from './accBim360'
import { DailyUserCloudAdapter } from './dailyUserCloud'
import { DailyUserDesktopAdapter } from './dailyUserDesktop'
import { ManualAdjustmentsAdapter } from './manualAdjustments'
import { IngestionAdapter } from './base'

export function getAdapter(datasetType: DatasetType): IngestionAdapter {
  switch (datasetType) {
    case 'acc_bim360':
      return new AccBim360Adapter()
    case 'daily_user_cloud':
      return new DailyUserCloudAdapter()
    case 'daily_user_desktop':
      return new DailyUserDesktopAdapter()
    case 'manual_adjustments':
      return new ManualAdjustmentsAdapter()
    default:
      throw new Error(`Unknown dataset type: ${datasetType}`)
  }
}
