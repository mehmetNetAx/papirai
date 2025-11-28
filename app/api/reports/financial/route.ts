import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAuthUser } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractVariable from '@/lib/db/models/ContractVariable';
import mongoose from 'mongoose';
import { buildReportFilters } from '@/lib/utils/report-filters';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build filters based on user context
    const { companyFilter, workspaceFilter } = await buildReportFilters(user);

    // Get all active contracts
    const contracts = await Contract.find({
      ...companyFilter,
      ...workspaceFilter,
      isActive: true,
    })
      .select('_id title status counterparty currency value')
      .lean();

    // Get master variables for contractValue and currency
    const contractIds = contracts.map((c: any) => c._id);
    const masterVariables = await ContractVariable.find({
      contractId: { $in: contractIds },
      $or: [
        { isMaster: true },
        { masterType: { $exists: true, $ne: null } },
        { masterType: 'contractValue' },
        { masterType: 'currency' },
      ],
    }).lean();

    // Group master variables by contract
    const variablesByContract: Record<string, { contractValue?: number; currency?: string }> = {};
    for (const variable of masterVariables) {
      const contractId = (variable.contractId as any).toString();
      if (!variablesByContract[contractId]) {
        variablesByContract[contractId] = {};
      }
      if (variable.masterType === 'contractValue') {
        variablesByContract[contractId].contractValue =
          typeof variable.value === 'number' ? variable.value : parseFloat(variable.value as string) || 0;
      } else if (variable.masterType === 'currency') {
        variablesByContract[contractId].currency = variable.value as string;
      }
    }

    // Build contracts with financial data
    const contractsWithFinancial: Array<{
      _id: string;
      title: string;
      contractValue: number;
      currency: string;
      status: string;
      counterparty?: string;
    }> = [];

    const currencyTotals: Record<string, { total: number; count: number }> = {};

    for (const contract of contracts) {
      const contractId = contract._id.toString();
      const masterVars = variablesByContract[contractId] || {};

      // Prefer master variables, fallback to contract fields
      const contractValue =
        masterVars.contractValue !== undefined
          ? masterVars.contractValue
          : (contract.value as number) || 0;
      const currency = masterVars.currency || (contract.currency as string) || 'USD';

      if (contractValue > 0) {
        contractsWithFinancial.push({
          _id: contractId,
          title: contract.title,
          contractValue,
          currency,
          status: contract.status,
          counterparty: contract.counterparty as string | undefined,
        });

        // Accumulate totals by currency
        if (!currencyTotals[currency]) {
          currencyTotals[currency] = { total: 0, count: 0 };
        }
        currencyTotals[currency].total += contractValue;
        currencyTotals[currency].count += 1;
      }
    }

    // Calculate summary
    const totalValue = contractsWithFinancial.reduce((sum, c) => sum + c.contractValue, 0);
    const averageValue =
      contractsWithFinancial.length > 0 ? totalValue / contractsWithFinancial.length : 0;

    const totalByCurrency = Object.entries(currencyTotals).map(([currency, data]) => ({
      currency,
      total: data.total,
      count: data.count,
    }));

    return NextResponse.json({
      totalByCurrency,
      contracts: contractsWithFinancial,
      summary: {
        totalContracts: contractsWithFinancial.length,
        totalValue,
        averageValue,
        currencies: Object.keys(currencyTotals),
      },
    });
  } catch (error: any) {
    console.error('Error generating financial report:', error);
    return NextResponse.json(
      { error: 'Failed to generate financial report', details: error.message },
      { status: 500 }
    );
  }
}

