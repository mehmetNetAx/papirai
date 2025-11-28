import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractVersion from '@/lib/db/models/ContractVersion';
import DiffMatchPatch from 'diff-match-patch';

const dmp = new DiffMatchPatch();

export async function createVersion(
  contractId: string,
  content: string,
  userId: string,
  changeSummary?: string
): Promise<string> {
  await connectDB();

  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  // Get previous version
  const previousVersion = await ContractVersion.findOne({
    contractId,
  }).sort({ versionNumber: -1 });

  const versionNumber = previousVersion
    ? previousVersion.versionNumber + 1
    : 1;

  // Calculate changes if previous version exists
  let changes: any[] = [];
  if (previousVersion) {
    const diffs = dmp.diff_main(previousVersion.content, content);
    dmp.diff_cleanupSemantic(diffs);

    let position = 0;
    for (const [operation, text] of diffs) {
      if (operation === 1) {
        // Addition
        changes.push({
          type: 'addition',
          position,
          text,
          userId,
          timestamp: new Date(),
        });
        position += text.length;
      } else if (operation === -1) {
        // Deletion
        changes.push({
          type: 'deletion',
          position,
          text,
          userId,
          timestamp: new Date(),
        });
      } else {
        // No change
        position += text.length;
      }
    }
  }

  const version = await ContractVersion.create({
    contractId,
    versionNumber,
    content,
    createdBy: userId,
    changeSummary,
    changes,
  });

  // Update contract's current version
  contract.currentVersionId = version._id;
  await contract.save();

  return version._id.toString();
}

export async function getVersions(contractId: string) {
  await connectDB();

  const versions = await ContractVersion.find({ contractId })
    .populate('createdBy', 'name email')
    .sort({ versionNumber: -1 })
    .lean();

  return versions;
}

export async function getVersion(versionId: string) {
  await connectDB();

  const version = await ContractVersion.findById(versionId)
    .populate('createdBy', 'name email')
    .lean();

  return version;
}

export async function compareVersions(
  versionId1: string,
  versionId2: string
) {
  await connectDB();

  const [version1, version2] = await Promise.all([
    ContractVersion.findById(versionId1),
    ContractVersion.findById(versionId2),
  ]);

  if (!version1 || !version2) {
    throw new Error('One or both versions not found');
  }

  const diffs = dmp.diff_main(version1.content, version2.content);
  dmp.diff_cleanupSemantic(diffs);

  return {
    diffs,
    version1: {
      id: version1._id.toString(),
      versionNumber: version1.versionNumber,
      createdAt: version1.createdAt,
    },
    version2: {
      id: version2._id.toString(),
      versionNumber: version2.versionNumber,
      createdAt: version2.createdAt,
    },
  };
}

export async function restoreVersion(contractId: string, versionId: string, userId: string) {
  await connectDB();

  const version = await ContractVersion.findById(versionId);
  if (!version || version.contractId.toString() !== contractId) {
    throw new Error('Version not found');
  }

  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  // Update contract content with the restored version's content
  contract.content = version.content;
  contract.updatedAt = new Date();
  await contract.save();

  // Create a new version with the restored content (so we have a record of the restore action)
  await createVersion(contractId, version.content, userId, 'Restored from version ' + version.versionNumber);

  return contract;
}

