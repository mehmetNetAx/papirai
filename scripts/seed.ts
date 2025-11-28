import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../lib/db/connection';
import User from '../lib/db/models/User';
import Company from '../lib/db/models/Company';
import Workspace from '../lib/db/models/Workspace';
import Contract from '../lib/db/models/Contract';
import ContractVersion from '../lib/db/models/ContractVersion';
import ContractVariable from '../lib/db/models/ContractVariable';
import Approval from '../lib/db/models/Approval';
import Signature from '../lib/db/models/Signature';
import ComplianceCheck from '../lib/db/models/ComplianceCheck';
import Notification from '../lib/db/models/Notification';

async function seed() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Connected to database');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Company.deleteMany({});
    await Workspace.deleteMany({});
    await Contract.deleteMany({});
    await ContractVersion.deleteMany({});
    await ContractVariable.deleteMany({});
    await Approval.deleteMany({});
    await Signature.deleteMany({});
    await ComplianceCheck.deleteMany({});
    await Notification.deleteMany({});
    console.log('Cleared existing data');

    // Create Group Company
    console.log('Creating companies...');
    const groupCompany = await Company.create({
      name: 'Acme Corporation',
      type: 'group',
      isActive: true,
      settings: {
        allowSelfRegistration: false,
      },
    });

    const subsidiary1 = await Company.create({
      name: 'Acme Manufacturing',
      type: 'subsidiary',
      parentCompanyId: groupCompany._id,
      isActive: true,
    });

    const subsidiary2 = await Company.create({
      name: 'Acme Services',
      type: 'subsidiary',
      parentCompanyId: groupCompany._id,
      isActive: true,
    });

    console.log('Created companies:', {
      group: groupCompany.name,
      subsidiaries: [subsidiary1.name, subsidiary2.name],
    });

    // Create Users
    console.log('Creating users...');
    const systemAdmin = await User.create({
      email: 'admin@acme.com',
      password: 'Admin123!',
      name: 'System Administrator',
      role: 'system_admin',
      companyId: groupCompany._id,
      groupId: groupCompany._id,
      isActive: true,
    });

    const groupAdmin = await User.create({
      email: 'groupadmin@acme.com',
      password: 'Admin123!',
      name: 'Group Admin',
      role: 'group_admin',
      companyId: groupCompany._id,
      groupId: groupCompany._id,
      isActive: true,
    });

    const companyAdmin1 = await User.create({
      email: 'admin@manufacturing.acme.com',
      password: 'Admin123!',
      name: 'Manufacturing Admin',
      role: 'company_admin',
      companyId: subsidiary1._id,
      groupId: groupCompany._id,
      isActive: true,
    });

    const contractManager1 = await User.create({
      email: 'manager@manufacturing.acme.com',
      password: 'Manager123!',
      name: 'John Manager',
      role: 'contract_manager',
      companyId: subsidiary1._id,
      groupId: groupCompany._id,
      isActive: true,
    });

    const legalReviewer1 = await User.create({
      email: 'legal@manufacturing.acme.com',
      password: 'Legal123!',
      name: 'Sarah Legal',
      role: 'legal_reviewer',
      companyId: subsidiary1._id,
      groupId: groupCompany._id,
      isActive: true,
    });

    const viewer1 = await User.create({
      email: 'viewer@manufacturing.acme.com',
      password: 'Viewer123!',
      name: 'Bob Viewer',
      role: 'viewer',
      companyId: subsidiary1._id,
      groupId: groupCompany._id,
      isActive: true,
    });

    console.log('Created users');

    // Create Workspaces
    console.log('Creating workspaces...');
    const salesWorkspace = await Workspace.create({
      name: 'Sales Contracts',
      companyId: subsidiary1._id,
      description: 'All sales and customer agreements',
      createdBy: companyAdmin1._id,
      isActive: true,
    });

    const procurementWorkspace = await Workspace.create({
      name: 'Procurement Contracts',
      companyId: subsidiary1._id,
      description: 'Supplier and vendor contracts',
      createdBy: companyAdmin1._id,
      isActive: true,
    });

    const hrWorkspace = await Workspace.create({
      name: 'HR Agreements',
      companyId: subsidiary1._id,
      description: 'Employment and HR-related agreements',
      createdBy: companyAdmin1._id,
      isActive: true,
    });

    console.log('Created workspaces');

    // Create Contracts
    console.log('Creating contracts...');
    const contract1 = await Contract.create({
      title: 'Master Service Agreement with TechCorp',
      content: `
        <h1>Master Service Agreement</h1>
        <p>This Master Service Agreement ("Agreement") is entered into on <strong>{{EffectiveDate}}</strong> between Acme Manufacturing ("Company") and TechCorp ("Vendor").</p>
        
        <h2>1. Services</h2>
        <p>Vendor agrees to provide IT support services as described in Exhibit A.</p>
        
        <h2>2. Payment Terms</h2>
        <p>The total contract value is <strong>{{ContractValue}}</strong> payable in monthly installments of <strong>{{MonthlyPayment}}</strong>.</p>
        <p>Payment is due within <strong>{{PaymentTerms}}</strong> days of invoice receipt.</p>
        
        <h2>3. Term and Termination</h2>
        <p>This Agreement shall commence on <strong>{{StartDate}}</strong> and continue until <strong>{{EndDate}}</strong>.</p>
        <p>Either party may terminate with <strong>{{NoticePeriod}}</strong> days written notice.</p>
        
        <h2>4. Service Level Agreement</h2>
        <p>Vendor shall maintain <strong>{{UptimeRequirement}}</strong> uptime and respond to critical issues within <strong>{{ResponseTime}}</strong> hours.</p>
        
        <h2>5. Delivery Schedule</h2>
        <p>Initial deliverables must be completed by <strong>{{DeliveryDeadline}}</strong>.</p>
      `,
      status: 'executed',
      workspaceId: salesWorkspace._id,
      companyId: subsidiary1._id,
      createdBy: contractManager1._id,
      contractType: 'Service Agreement',
      counterparty: 'TechCorp Inc.',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-12-31'),
      renewalDate: new Date('2025-11-01'),
      value: 500000,
      currency: 'USD',
      tags: ['IT', 'Services', 'Technology'],
      isActive: true,
    });

    const contract2 = await Contract.create({
      title: 'Supply Agreement - Raw Materials',
      content: `
        <h1>Supply Agreement</h1>
        <p>This Supply Agreement is entered into between Acme Manufacturing and Global Supplies Ltd.</p>
        
        <h2>1. Products</h2>
        <p>Supplier agrees to provide raw materials as specified in the attached schedule.</p>
        
        <h2>2. Pricing</h2>
        <p>Unit price: <strong>{{UnitPrice}}</strong> per ton.</p>
        <p>Minimum order quantity: <strong>{{MinOrderQuantity}}</strong> tons.</p>
        
        <h2>3. Delivery</h2>
        <p>Deliveries must be made within <strong>{{DeliveryWindow}}</strong> days of order placement.</p>
        <p>Late delivery penalty: <strong>{{LateDeliveryPenalty}}</strong> per day.</p>
        
        <h2>4. Quality Standards</h2>
        <p>Materials must meet <strong>{{QualityStandard}}</strong> specifications.</p>
      `,
      status: 'pending_approval',
      workspaceId: procurementWorkspace._id,
      companyId: subsidiary1._id,
      createdBy: contractManager1._id,
      contractType: 'Supply Agreement',
      counterparty: 'Global Supplies Ltd.',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2026-02-28'),
      value: 1200000,
      currency: 'USD',
      tags: ['Procurement', 'Raw Materials', 'Supply'],
      isActive: true,
    });

    const contract3 = await Contract.create({
      title: 'Employment Agreement - Senior Developer',
      content: `
        <h1>Employment Agreement</h1>
        <p>This Employment Agreement is entered into between Acme Manufacturing and the Employee.</p>
        
        <h2>1. Position</h2>
        <p>Senior Software Developer</p>
        
        <h2>2. Compensation</h2>
        <p>Annual salary: <strong>{{AnnualSalary}}</strong></p>
        <p>Bonus eligibility: Up to <strong>{{BonusPercentage}}</strong> of base salary.</p>
        
        <h2>3. Benefits</h2>
        <p>Health insurance, <strong>{{VacationDays}}</strong> days paid vacation, and retirement plan.</p>
        
        <h2>4. Term</h2>
        <p>Employment begins on <strong>{{EmploymentStartDate}}</strong> and is at-will.</p>
      `,
      status: 'draft',
      workspaceId: hrWorkspace._id,
      companyId: subsidiary1._id,
      createdBy: companyAdmin1._id,
      contractType: 'Employment Agreement',
      counterparty: 'Employee',
      startDate: new Date('2024-06-01'),
      value: 150000,
      currency: 'USD',
      tags: ['HR', 'Employment', 'Personnel'],
      isActive: true,
    });

    const contract4 = await Contract.create({
      title: 'Software License Agreement - Enterprise Suite',
      content: `
        <h1>Software License Agreement</h1>
        <p>This Software License Agreement is entered into between Acme Manufacturing and Software Solutions Inc.</p>
        
        <h2>1. Licensed Software</h2>
        <p>Enterprise Management Suite v3.0</p>
        
        <h2>2. License Fee</h2>
        <p>Annual license fee: <strong>{{LicenseFee}}</strong></p>
        <p>Number of users: <strong>{{NumberOfUsers}}</strong></p>
        
        <h2>3. Support</h2>
        <p>Support response time: <strong>{{SupportResponseTime}}</strong> hours for critical issues.</p>
        
        <h2>4. Term</h2>
        <p>License period: <strong>{{LicenseStartDate}}</strong> to <strong>{{LicenseEndDate}}</strong></p>
      `,
      status: 'approved',
      workspaceId: salesWorkspace._id,
      companyId: subsidiary1._id,
      createdBy: contractManager1._id,
      contractType: 'License Agreement',
      counterparty: 'Software Solutions Inc.',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2025-01-14'),
      renewalDate: new Date('2024-12-01'),
      value: 250000,
      currency: 'USD',
      tags: ['Software', 'License', 'Technology'],
      isActive: true,
    });

    console.log('Created contracts');

    // Create Contract Variables
    console.log('Creating contract variables...');
    
    // Contract 1 variables
    await ContractVariable.create({
      contractId: contract1._id,
      name: 'EffectiveDate',
      value: 'January 1, 2024',
      type: 'date',
      taggedText: 'January 1, 2024',
      isComplianceTracked: false,
    });

    await ContractVariable.create({
      contractId: contract1._id,
      name: 'ContractValue',
      value: 500000,
      type: 'currency',
      taggedText: '$500,000',
      isComplianceTracked: true,
    });

    await ContractVariable.create({
      contractId: contract1._id,
      name: 'MonthlyPayment',
      value: 41667,
      type: 'currency',
      taggedText: '$41,667',
      isComplianceTracked: true,
    });

    await ContractVariable.create({
      contractId: contract1._id,
      name: 'PaymentTerms',
      value: 30,
      type: 'number',
      taggedText: '30',
      isComplianceTracked: true,
    });

    await ContractVariable.create({
      contractId: contract1._id,
      name: 'DeliveryDeadline',
      value: new Date('2024-03-31'),
      type: 'date',
      taggedText: 'March 31, 2024',
      isComplianceTracked: true,
    });

    // Contract 2 variables
    await ContractVariable.create({
      contractId: contract2._id,
      name: 'UnitPrice',
      value: 1250,
      type: 'currency',
      taggedText: '$1,250',
      isComplianceTracked: true,
    });

    await ContractVariable.create({
      contractId: contract2._id,
      name: 'MinOrderQuantity',
      value: 100,
      type: 'number',
      taggedText: '100',
      isComplianceTracked: true,
    });

    await ContractVariable.create({
      contractId: contract2._id,
      name: 'DeliveryWindow',
      value: 14,
      type: 'number',
      taggedText: '14',
      isComplianceTracked: true,
    });

    // Contract 4 variables
    await ContractVariable.create({
      contractId: contract4._id,
      name: 'LicenseFee',
      value: 250000,
      type: 'currency',
      taggedText: '$250,000',
      isComplianceTracked: true,
    });

    await ContractVariable.create({
      contractId: contract4._id,
      name: 'NumberOfUsers',
      value: 500,
      type: 'number',
      taggedText: '500',
      isComplianceTracked: false,
    });

    console.log('Created contract variables');

    // Create Versions
    console.log('Creating contract versions...');
    const version1 = await ContractVersion.create({
      contractId: contract1._id,
      versionNumber: 1,
      content: contract1.content,
      createdBy: contractManager1._id,
      changeSummary: 'Initial version',
    });

    const version2 = await ContractVersion.create({
      contractId: contract1._id,
      versionNumber: 2,
      content: contract1.content.replace('$500,000', '$550,000'),
      createdBy: legalReviewer1._id,
      changeSummary: 'Updated contract value after negotiation',
      changes: [
        {
          type: 'modification',
          position: 100,
          text: '$550,000',
          userId: legalReviewer1._id,
          timestamp: new Date(),
        },
      ],
    });

    contract1.currentVersionId = version2._id;
    await contract1.save();

    console.log('Created contract versions');

    // Create Approvals
    console.log('Creating approvals...');
    await Approval.create({
      contractId: contract2._id,
      approverId: legalReviewer1._id,
      status: 'pending',
      workflowStep: 1,
      workflowType: 'sequential',
    });

    await Approval.create({
      contractId: contract2._id,
      approverId: companyAdmin1._id,
      status: 'pending',
      workflowStep: 2,
      workflowType: 'sequential',
    });

    await Approval.create({
      contractId: contract4._id,
      approverId: legalReviewer1._id,
      status: 'approved',
      workflowStep: 1,
      workflowType: 'sequential',
      comments: 'Approved - standard license terms',
      approvedAt: new Date('2024-01-10'),
    });

    await Approval.create({
      contractId: contract4._id,
      approverId: companyAdmin1._id,
      status: 'approved',
      workflowStep: 2,
      workflowType: 'sequential',
      comments: 'Budget approved',
      approvedAt: new Date('2024-01-12'),
    });

    console.log('Created approvals');

    // Create Signatures
    console.log('Creating signatures...');
    await Signature.create({
      contractId: contract1._id,
      signerId: contractManager1._id,
      type: 'digital',
      status: 'signed',
      signedAt: new Date('2024-01-05'),
      documentUrl: 's3://contracts/signed/contract1.pdf',
    });

    await Signature.create({
      contractId: contract4._id,
      signerId: contractManager1._id,
      type: 'digital',
      status: 'signed',
      signedAt: new Date('2024-01-15'),
      documentUrl: 's3://contracts/signed/contract4.pdf',
    });

    console.log('Created signatures');

    // Create Compliance Checks
    console.log('Creating compliance checks...');
    await ComplianceCheck.create({
      contractId: contract1._id,
      expectedValue: 41667,
      actualValue: 45000,
      status: 'non_compliant',
      alertLevel: 'high',
      deviation: {
        type: 'price',
        amount: 3333,
        percentage: 8,
        description: 'Monthly payment exceeded contract amount',
      },
      source: 'manual',
      checkedAt: new Date('2024-02-15'),
    });

    await ComplianceCheck.create({
      contractId: contract1._id,
      expectedValue: new Date('2024-03-31'),
      actualValue: new Date('2024-04-05'),
      status: 'non_compliant',
      alertLevel: 'medium',
      deviation: {
        type: 'delivery_date',
        amount: 5,
        description: 'Delivery was 5 days late',
      },
      source: 'manual',
      checkedAt: new Date('2024-04-06'),
    });

    await ComplianceCheck.create({
      contractId: contract2._id,
      expectedValue: 1250,
      actualValue: 1250,
      status: 'compliant',
      alertLevel: 'low',
      source: 'sap',
      sourceData: {
        orderNumber: 'PO-2024-001',
        itemNumber: 'ITEM-001',
      },
      checkedAt: new Date('2024-03-15'),
    });

    console.log('Created compliance checks');

    // Create Notifications
    console.log('Creating notifications...');
    await Notification.create({
      userId: legalReviewer1._id,
      type: 'approval_request',
      message: 'Contract "Supply Agreement - Raw Materials" requires your approval',
      read: false,
      relatedResourceType: 'approval',
      relatedResourceId: (await Approval.findOne({ contractId: contract2._id, workflowStep: 1 }))?._id,
    });

    await Notification.create({
      userId: contractManager1._id,
      type: 'compliance_alert',
      message: 'Compliance alert for contract "Master Service Agreement with TechCorp": Non-compliant',
      read: false,
      relatedResourceType: 'compliance',
      relatedResourceId: (await ComplianceCheck.findOne({ contractId: contract1._id }))?._id,
    });

    await Notification.create({
      userId: contractManager1._id,
      type: 'signature_completed',
      message: 'Contract "Master Service Agreement with TechCorp" has been fully executed',
      read: true,
      readAt: new Date('2024-01-06'),
      relatedResourceType: 'contract',
      relatedResourceId: contract1._id,
    });

    console.log('Created notifications');

    console.log('\n✅ Seed data created successfully!');
    console.log('\nSample login credentials:');
    console.log('System Admin: admin@acme.com / Admin123!');
    console.log('Group Admin: groupadmin@acme.com / Admin123!');
    console.log('Company Admin: admin@manufacturing.acme.com / Admin123!');
    console.log('Contract Manager: manager@manufacturing.acme.com / Manager123!');
    console.log('Legal Reviewer: legal@manufacturing.acme.com / Legal123!');
    console.log('Viewer: viewer@manufacturing.acme.com / Viewer123!');
    console.log('\n📊 Summary:');
    console.log(`- Companies: 3 (1 group, 2 subsidiaries)`);
    console.log(`- Users: 6`);
    console.log(`- Workspaces: 3`);
    console.log(`- Contracts: 4`);
    console.log(`- Variables: 10`);
    console.log(`- Versions: 2`);
    console.log(`- Approvals: 4`);
    console.log(`- Signatures: 2`);
    console.log(`- Compliance Checks: 3`);
    console.log(`- Notifications: 3`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();

