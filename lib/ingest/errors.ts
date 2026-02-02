export class IngestionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly datasetId?: string
  ) {
    super(message)
    this.name = 'IngestionError'
  }
}

export class FileParseError extends IngestionError {
  constructor(message: string, datasetId?: string) {
    super(message, 'FILE_PARSE_ERROR', datasetId)
    this.name = 'FileParseError'
  }
}

export class DatasetTypeDetectionError extends IngestionError {
  constructor(message: string, datasetId?: string) {
    super(message, 'TYPE_DETECTION_ERROR', datasetId)
    this.name = 'DatasetTypeDetectionError'
  }
}

export class ValidationError extends IngestionError {
  constructor(message: string, datasetId?: string) {
    super(message, 'VALIDATION_ERROR', datasetId)
    this.name = 'ValidationError'
  }
}

export class NormalizationError extends IngestionError {
  constructor(message: string, datasetId?: string) {
    super(message, 'NORMALIZATION_ERROR', datasetId)
    this.name = 'NormalizationError'
  }
}

export class DatabaseError extends IngestionError {
  constructor(message: string, datasetId?: string) {
    super(message, 'DATABASE_ERROR', datasetId)
    this.name = 'DatabaseError'
  }
}
