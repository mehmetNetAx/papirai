import connectDB from '@/lib/db/connection';
import Notification from '@/lib/db/models/Notification';
import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return transporter;
}

export async function sendEmailNotification(
  userId: string,
  email: string,
  subject: string,
  message: string
): Promise<void> {
  try {
    const mailTransporter = getTransporter();
    
    await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@papirai.com',
      to: email,
      subject,
      html: message,
    });
  } catch (error) {
    console.error('Failed to send email notification:', error);
    // Don't throw - email failures shouldn't break the app
  }
}

export async function getNotifications(userId: string, unreadOnly: boolean = false) {
  await connectDB();
  const mongoose = await import('mongoose');
  const userIdObj = new mongoose.default.Types.ObjectId(userId);

  const query: any = { userId: userIdObj };
  if (unreadOnly) {
    query.read = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return notifications;
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  await connectDB();
  const mongoose = await import('mongoose');
  const notificationIdObj = new mongoose.default.Types.ObjectId(notificationId);
  const userIdObj = new mongoose.default.Types.ObjectId(userId);

  const notification = await Notification.findOne({
    _id: notificationIdObj,
    userId: userIdObj,
  });

  if (notification && !notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  await connectDB();
  const mongoose = await import('mongoose');
  const userIdObj = new mongoose.default.Types.ObjectId(userId);
  return await Notification.countDocuments({
    userId: userIdObj,
    read: false,
  });
}

export async function markAllAsRead(userId: string) {
  await connectDB();
  const mongoose = await import('mongoose');
  const userIdObj = new mongoose.default.Types.ObjectId(userId);
  const result = await Notification.updateMany(
    { userId: userIdObj, read: false },
    { 
      $set: { 
        read: true,
        readAt: new Date(),
      } 
    }
  );
  return result;
}

export async function deleteNotification(notificationId: string, userId: string) {
  await connectDB();
  const mongoose = await import('mongoose');
  const userIdObj = new mongoose.default.Types.ObjectId(userId);
  const notificationIdObj = new mongoose.default.Types.ObjectId(notificationId);
  const notification = await Notification.findOneAndDelete({
    _id: notificationIdObj,
    userId: userIdObj,
  });
  return notification;
}

export async function createContractAssignmentNotification(
  userId: string,
  contractId: string,
  contractTitle: string,
  assignedBy: string
): Promise<void> {
  await connectDB();
  
  const User = (await import('@/lib/db/models/User')).default;
  const assignedByUser = await User.findById(assignedBy).select('name email').lean();
  const assignedByUserName = (assignedByUser as any)?.name || 'Bir kullanıcı';

  await Notification.create({
    userId: new (await import('mongoose')).default.Types.ObjectId(userId),
    type: 'contract_assigned',
    message: `${assignedByUserName} size "${contractTitle}" sözleşmesini atadı.`,
    relatedResourceType: 'contract',
    relatedResourceId: new (await import('mongoose')).default.Types.ObjectId(contractId),
    metadata: {
      contractTitle,
      assignedBy,
      assignedByUserName,
    },
  });
}

export async function createContractUpdateNotification(
  userId: string,
  contractId: string,
  contractTitle: string,
  updatedBy: string,
  changes?: string[]
): Promise<void> {
  await connectDB();
  
  const User = (await import('@/lib/db/models/User')).default;
  const updatedByUser = await User.findById(updatedBy).select('name email').lean();
  const updatedByUserName = (updatedByUser as any)?.name || 'Bir kullanıcı';

  const changesText = changes && changes.length > 0 
    ? ` (${changes.join(', ')})`
    : '';

  await Notification.create({
    userId: new (await import('mongoose')).default.Types.ObjectId(userId),
    type: 'contract_updated',
    message: `${updatedByUserName} "${contractTitle}" sözleşmesini güncelledi${changesText}.`,
    relatedResourceType: 'contract',
    relatedResourceId: new (await import('mongoose')).default.Types.ObjectId(contractId),
    metadata: {
      contractTitle,
      updatedBy,
      updatedByUserName,
      changes: changes || [],
    },
  });
}

export async function createContractAlertNotification(
  userId: string,
  contractId: string,
  contractTitle: string,
  alertType: string,
  message: string
): Promise<void> {
  await connectDB();

  await Notification.create({
    userId: new (await import('mongoose')).default.Types.ObjectId(userId),
    type: 'contract_alert',
    message,
    relatedResourceType: 'contract',
    relatedResourceId: new (await import('mongoose')).default.Types.ObjectId(contractId),
    metadata: {
      contractTitle,
      alertType,
    },
  });
}

