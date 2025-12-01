// Central export for all models
export { default as User } from './User';
export { default as Company } from './Company';
export { default as Workspace } from './Workspace';
export { default as Contract } from './Contract';
export { default as ContractVersion } from './ContractVersion';
export { default as ContractVariable } from './ContractVariable';
export { default as ContractAttachment } from './ContractAttachment';
export { default as CompanyDocument } from './CompanyDocument';
export { default as Approval } from './Approval';
export { default as Signature } from './Signature';
export { default as ComplianceCheck } from './ComplianceCheck';
export { default as AuditLog } from './AuditLog';
export { default as Notification } from './Notification';
export { default as ContractAnalysis } from './ContractAnalysis';

// Type exports
export type { IUser } from './User';
export type { ICompany } from './Company';
export type { IWorkspace } from './Workspace';
export type { IContract } from './Contract';
export type { IContractVersion } from './ContractVersion';
export type { IContractVariable } from './ContractVariable';
export type { IContractAttachment, AttachmentType } from './ContractAttachment';
export type { ICompanyDocument, DocumentType } from './CompanyDocument';
export type { IApproval } from './Approval';
export type { ISignature } from './Signature';
export type { IComplianceCheck } from './ComplianceCheck';
export type { IAuditLog } from './AuditLog';
export type { INotification } from './Notification';
export type { IContractAnalysis, ICriterion, ISubCriterion } from './ContractAnalysis';

