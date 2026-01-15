import { Request, Response, NextFunction } from "express";
import * as transactionService from "../services/transaction.service";

export const createTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const transaction = await transactionService.createTransaction(userId, req.body);

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const transactions = await transactionService.getUserTransactions(userId);

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadProof = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const transactionId = req.params.id;
    const file = req.file;

    if (!file) {
        throw new Error("No file uploaded");
    }

    const filePath = file.path; 

    const transaction = await transactionService.uploadPaymentProof(transactionId, userId, filePath);

    res.status(200).json({
      success: true,
      message: "Payment proof uploaded successfully",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};
