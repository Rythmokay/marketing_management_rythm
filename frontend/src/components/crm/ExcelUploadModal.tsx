import React, { useState, useRef } from 'react';
import { readExcelOrCsvFile, downloadSampleTemplate } from '../../utils/excelUtils';
import type { ParsedSheetData } from '../../utils/excelUtils';
import type { InfluencerRecord, DynamicColumn } from '../../types/crm';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (records: InfluencerRecord[], columns: DynamicColumn[], mode: 'replace' | 'append') => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSheetData | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (selectedFile: File) => {
    setErrorMessage(null);
    setIsLoading(true);
    setFile(selectedFile);

    try {
      const result = await readExcelOrCsvFile(selectedFile);
      setParsedData(result);
    } catch (err: any) {
      console.error("Failed to parse file:", err);
      setErrorMessage(err.message || "Failed to read file. Please ensure it is a valid .xlsx, .xls, or .csv document.");
      setParsedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileProcess(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedData && parsedData.data.length > 0) {
      onImport(parsedData.data, parsedData.columns, importMode);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-base text-slate-900">Import Spreadsheet</h3>
            <p className="text-xs text-slate-500 mt-0.5">Upload .xlsx, .xls, or .csv file to import records</p>
          </div>
          <button
            className="text-slate-400 hover:text-slate-900 hover:bg-slate-200 text-xl leading-none px-2 py-1 rounded transition-all cursor-pointer"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center bg-slate-50 cursor-pointer transition-all ${
              isDragOver ? 'border-blue-600 bg-blue-50' : file ? 'border-emerald-500 bg-emerald-50/50 p-4' : 'border-slate-300 hover:border-blue-600 hover:bg-blue-50/30'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-1.5">
              {isLoading ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <span className="text-xs font-semibold text-blue-600">Processing spreadsheet data...</span>
                </div>
              ) : file ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-sm text-slate-900">{file.name}</span>
                    <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB • Click to change file</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 font-semibold text-xs px-2.5 py-1 rounded-full border border-emerald-200">
                    Ready
                  </span>
                </div>
              ) : (
                <>
                  <h4 className="font-semibold text-sm text-slate-800">Drag & Drop file here or browse</h4>
                  <p className="text-xs text-slate-500">Supports .xlsx, .xls, and .csv files</p>
                  <button type="button" className="mt-2 px-4 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-all cursor-pointer shadow-xs">
                    Browse File
                  </button>
                </>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-xs">
              {errorMessage}
            </div>
          )}

          {/* Download Sample Templates */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-50 border border-slate-200 p-3 rounded-md text-xs text-slate-600">
            <span>Need a format guide? Download sample template:</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                onClick={() => downloadSampleTemplate('xlsx')}
              >
                Sample Excel (.xlsx)
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                onClick={() => downloadSampleTemplate('csv')}
              >
                Sample CSV (.csv)
              </button>
            </div>
          </div>

          {/* Parsed Preview Section */}
          {parsedData && (
            <div className="flex flex-col gap-3 bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-2">
                  <span className="bg-slate-100 px-2.5 py-1 rounded text-xs text-slate-700">
                    <strong className="font-semibold">{parsedData.data.length}</strong> rows detected
                  </span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded text-xs text-slate-700">
                    <strong className="font-semibold">{parsedData.columns.length}</strong> columns mapped
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Replace Current Data</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Append to Table</span>
                  </label>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {parsedData.columns.slice(0, 6).map(col => (
                        <th key={col.key} className="px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">{col.label}</th>
                      ))}
                      {parsedData.columns.length > 6 && <th className="px-3 py-2 font-semibold text-slate-600">+{parsedData.columns.length - 6} More</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.data.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        {parsedData.columns.slice(0, 6).map(col => (
                          <td key={col.key} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                            {String(row[col.key] || '')}
                          </td>
                        ))}
                        {parsedData.columns.length > 6 && <td className="px-3 py-2 text-slate-400">...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
          <button
            type="button"
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-100 transition-all cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-5 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
            disabled={!parsedData || parsedData.data.length === 0}
            onClick={handleConfirmImport}
          >
            Import Records ({parsedData ? parsedData.data.length : 0})
          </button>
        </div>
      </div>
    </div>
  );
};
