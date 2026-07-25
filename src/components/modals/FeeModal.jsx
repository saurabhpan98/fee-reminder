import React from "react";
import { Icons } from "../Icons";

export function FeeModal({
  isFeeModalOpen, setIsFeeModalOpen,
  selectedStudentForFee, selectedMonth, selectedYear,
  handleSaveFeeStatus, feeFormData, setFeeFormData
}) {
  if (!isFeeModalOpen || !selectedStudentForFee) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-sm w-full p-6 space-y-4 animate-scale-up">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900">{selectedStudentForFee.name}</h3>
            <p className="text-3xs text-slate-400 font-medium">Fee for {selectedMonth} {selectedYear} (Total: ₹{selectedStudentForFee.monthlyFees})</p>
          </div>
          <button onClick={() => setIsFeeModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"><Icons.X /></button>
        </div>

        <form onSubmit={handleSaveFeeStatus} className="space-y-3">
          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Status</label>
            <select 
              value={feeFormData.status}
              onChange={(e) => setFeeFormData({ ...feeFormData, status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            >
              <option value="paid">✓ Fully Paid (₹{selectedStudentForFee.monthlyFees})</option>
              <option value="partial">⚠️ Partial Payment</option>
              <option value="unpaid">✕ Unpaid (₹0)</option>
            </select>
          </div>

          {feeFormData.status === "partial" && (
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Amount Paid Today (₹)
              </label>
              <input 
                type="number" required max={selectedStudentForFee.monthlyFees} min="0"
                placeholder="Enter partial amount"
                value={feeFormData.amountPaid}
                onChange={(e) => setFeeFormData({ ...feeFormData, amountPaid: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
              {feeFormData.amountPaid !== "" && (
                <p className="text-3xs text-amber-600 font-bold mt-1">
                  Remaining Due: ₹{selectedStudentForFee.monthlyFees - Number(feeFormData.amountPaid || 0)}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Remark / Note</label>
            <textarea 
              rows="2"
              placeholder="e.g. Paid cash, promised remaining balance next Monday"
              value={feeFormData.remark}
              onChange={(e) => setFeeFormData({ ...feeFormData, remark: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setIsFeeModalOpen(false)} 
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-xl font-semibold cursor-pointer transition-colors duration-150"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs rounded-xl font-semibold shadow-xs cursor-pointer transition-all duration-150"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}