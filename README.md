# Papirai - Smart Contract Management Platform

A comprehensive Contract Lifecycle Management (CLM) platform built with Next.js 16, providing end-to-end contract management capabilities including real-time collaborative editing, version control, compliance monitoring, approval workflows, and digital signatures.

## Features

### Core Functionality
- **Real-Time Collaborative Editing**: Multiple users can edit contracts simultaneously with Yjs and TipTap
- **Version Control**: Complete version history with diff comparison and restore capabilities
- **Variable Tagging**: Tag key terms in contracts as variables for compliance monitoring
- **Compliance Monitoring**: Automated compliance checks with integration support (SAP, etc.)
- **Approval Workflows**: Configurable sequential or parallel approval chains
- **Digital & Physical Signatures**: DocuSign integration and physical signature handling
- **Document Import/Export**: Import PDF/Word documents with OCR, export to Word/PDF
- **Multi-Company Hierarchy**: Support for group companies and subsidiaries with data segregation
- **Workspace Management**: Organize contracts by workspaces within companies
- **Role-Based Access Control**: Fine-grained permissions system
- **Audit Trail**: Complete audit logging of all user actions
- **Notifications**: In-app and email notifications for important events
- **Search & Discovery**: Full-text search with advanced filtering
- **Analytics & Reporting**: Dashboard with contract metrics and compliance analytics

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Rich Text Editor**: TipTap with Yjs for collaborative editing
- **Real-time Sync**: Yjs + WebSocket (Socket.io)
- **Authentication**: NextAuth.js
- **Database**: MongoDB with Mongoose ODM
- **File Storage**: AWS S3
- **E-Signatures**: DocuSign eSignature API
- **OCR**: AWS Textract
- **Background Jobs**: BullMQ with Redis
- **PDF Generation**: Puppeteer
- **Word Export**: docx library

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- Redis (for background jobs)
- AWS Account (for S3 and Textract)
- DocuSign Developer Account (optional, for e-signatures)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd papirai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `MONGODB_URI`: MongoDB connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your application URL
- AWS credentials for S3 and Textract
- Redis URL
- DocuSign credentials (if using)
- SMTP settings for email notifications

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### First User Setup

1. Register a new account at `/register`
2. The first user will be assigned to a default company
3. System admins can create additional companies and manage users

## Project Structure

```
app/
  (auth)/          # Authentication pages
  (dashboard)/     # Dashboard pages
  api/             # API routes
components/        # React components
lib/
  auth/            # Authentication configuration
  db/              # Database models and connection
  services/        # Business logic services
  utils/           # Utility functions
  aws/             # AWS service clients
  websocket/       # WebSocket server setup
  jobs/            # Background job definitions
```

## Key Features Implementation

### Real-Time Collaboration
- Uses Yjs for conflict-free collaborative editing
- WebSocket server for real-time synchronization
- Presence indicators and live cursors

### Version Control
- Automatic version creation on save
- Diff algorithm for change tracking
- Version comparison and restore

### Compliance Monitoring
- Tag contract terms as variables
- Scheduled jobs for integration sync (SAP)
- Automated compliance checks with alerts

### Approval Workflows
- Sequential or parallel approval chains
- Configurable workflow rules
- Email and in-app notifications

## API Documentation

### Contracts
- `GET /api/contracts` - List contracts
- `POST /api/contracts` - Create contract
- `GET /api/contracts/[id]` - Get contract
- `PATCH /api/contracts/[id]` - Update contract
- `DELETE /api/contracts/[id]` - Delete contract
- `GET /api/contracts/[id]/versions` - List versions
- `GET /api/contracts/[id]/export?format=pdf|word` - Export contract

### Variables
- `GET /api/variables?contractId=...` - List variables
- `POST /api/variables` - Create variable

### Approvals
- `GET /api/approvals` - List approvals
- `POST /api/approvals` - Create approval workflow
- `PATCH /api/approvals` - Approve/reject

### Signatures
- `GET /api/signatures` - List signatures
- `POST /api/signatures` - Create signature request

### Compliance
- `GET /api/compliance` - List compliance checks
- `POST /api/compliance` - Create compliance check
- `PATCH /api/compliance` - Resolve compliance check

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

## Deployment

### Environment Variables
Ensure all required environment variables are set in your production environment.

### Database
Set up MongoDB Atlas or your preferred MongoDB hosting.

### Redis
Set up Redis for background job processing.

### AWS Services
Configure S3 bucket and Textract access.

## Security Considerations

- All API routes are protected with authentication
- Role-based access control enforced
- Data segregation by company
- Audit logging for all actions
- HTTPS required in production
- Password hashing with bcrypt

## License

[Your License Here]

## Support

For issues and questions, please open an issue on GitHub.
# papirai
