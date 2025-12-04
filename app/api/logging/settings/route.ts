import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import LoggingSettings from '@/lib/db/models/LoggingSettings';
import mongoose from 'mongoose';

// GET - Get logging settings
export async function GET(req: NextRequest) {
  return requireRole(['system_admin'])(async (req: NextRequest, user) => {
    try {
      await connectDB();
      
      let settings = await LoggingSettings.findOne();
      if (!settings) {
        // Create default settings
        settings = await LoggingSettings.create({
          updatedBy: new mongoose.Types.ObjectId(user.id),
        });
      }
      
      // Convert to plain object and handle Map serialization
      const settingsObj = settings.toObject();
      
      // Convert Map to object for JSON serialization
      const userSettingsObj: Record<string, any> = {};
      if (settings.userSettings && settings.userSettings instanceof Map) {
        settings.userSettings.forEach((value, key) => {
          userSettingsObj[key] = value;
        });
      } else if (settingsObj.userSettings) {
        // Handle case where it's already an object
        Object.assign(userSettingsObj, settingsObj.userSettings);
      }
      
      return NextResponse.json({
        globalEnabled: settingsObj.globalEnabled ?? false,
        globalLogLevels: Array.isArray(settingsObj.globalLogLevels) ? settingsObj.globalLogLevels : ['info', 'warning', 'error'],
        globalActivityTypes: Array.isArray(settingsObj.globalActivityTypes) ? settingsObj.globalActivityTypes : ['login', 'logout', 'error', 'data_modification'],
        retentionDays: settingsObj.retentionDays ?? 90,
        autoCleanupEnabled: settingsObj.autoCleanupEnabled ?? false,
        autoCleanupSchedule: settingsObj.autoCleanupSchedule ?? '0 2 * * *',
        maxLogsPerUser: settingsObj.maxLogsPerUser ?? 10000,
        logIpAddress: settingsObj.logIpAddress ?? true,
        logUserAgent: settingsObj.logUserAgent ?? true,
        logRequestDetails: settingsObj.logRequestDetails ?? true,
        userSettings: userSettingsObj,
        _id: settingsObj._id.toString(),
        updatedBy: settingsObj.updatedBy?.toString(),
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error getting logging settings:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get logging settings' },
        { status: 500 }
      );
    }
  })(req);
}

// PATCH - Update logging settings
export async function PATCH(req: NextRequest) {
  return requireRole(['system_admin'])(async (req: NextRequest, user) => {
    try {
      await connectDB();
      
      const body = await req.json();
      
      let settings = await LoggingSettings.findOne();
      if (!settings) {
        settings = await LoggingSettings.create({
          updatedBy: new mongoose.Types.ObjectId(user.id),
        });
      }
      
      // Update global settings
      if (body.globalEnabled !== undefined) settings.globalEnabled = body.globalEnabled;
      if (body.globalLogLevels) settings.globalLogLevels = body.globalLogLevels;
      if (body.globalActivityTypes) settings.globalActivityTypes = body.globalActivityTypes;
      
      // Update retention settings
      if (body.retentionDays !== undefined) settings.retentionDays = body.retentionDays;
      if (body.autoCleanupEnabled !== undefined) settings.autoCleanupEnabled = body.autoCleanupEnabled;
      if (body.autoCleanupSchedule) settings.autoCleanupSchedule = body.autoCleanupSchedule;
      
      // Update storage settings
      if (body.maxLogsPerUser !== undefined) settings.maxLogsPerUser = body.maxLogsPerUser;
      
      // Update privacy settings
      if (body.logIpAddress !== undefined) settings.logIpAddress = body.logIpAddress;
      if (body.logUserAgent !== undefined) settings.logUserAgent = body.logUserAgent;
      if (body.logRequestDetails !== undefined) settings.logRequestDetails = body.logRequestDetails;
      
      // Update user-specific settings
      if (body.userSettings) {
        if (!settings.userSettings) {
          settings.userSettings = new Map();
        }
        Object.entries(body.userSettings).forEach(([userId, userSetting]: [string, any]) => {
          settings.userSettings!.set(userId, userSetting);
        });
      }
      
      settings.updatedBy = new mongoose.Types.ObjectId(user.id);
      await settings.save();
      
      const settingsObj = settings.toObject();
      
      // Convert Map to object for response
      const userSettingsObj: Record<string, any> = {};
      if (settings.userSettings && settings.userSettings instanceof Map) {
        settings.userSettings.forEach((value, key) => {
          userSettingsObj[key] = value;
        });
      } else if (settingsObj.userSettings) {
        Object.assign(userSettingsObj, settingsObj.userSettings);
      }
      
      return NextResponse.json({
        globalEnabled: settingsObj.globalEnabled ?? false,
        globalLogLevels: Array.isArray(settingsObj.globalLogLevels) ? settingsObj.globalLogLevels : ['info', 'warning', 'error'],
        globalActivityTypes: Array.isArray(settingsObj.globalActivityTypes) ? settingsObj.globalActivityTypes : ['login', 'logout', 'error', 'data_modification'],
        retentionDays: settingsObj.retentionDays ?? 90,
        autoCleanupEnabled: settingsObj.autoCleanupEnabled ?? false,
        autoCleanupSchedule: settingsObj.autoCleanupSchedule ?? '0 2 * * *',
        maxLogsPerUser: settingsObj.maxLogsPerUser ?? 10000,
        logIpAddress: settingsObj.logIpAddress ?? true,
        logUserAgent: settingsObj.logUserAgent ?? true,
        logRequestDetails: settingsObj.logRequestDetails ?? true,
        userSettings: userSettingsObj,
        _id: settingsObj._id.toString(),
        updatedBy: settingsObj.updatedBy?.toString(),
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error updating logging settings:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update logging settings' },
        { status: 500 }
      );
    }
  })(req);
}


