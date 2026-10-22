import * as XLSX from 'xlsx';
import { DEFAULT_COLUMNS } from '../types/crm';
import type { InfluencerRecord, DynamicColumn } from '../types/crm';

export interface ParsedSheetData {
  sheetNames: string[];
  activeSheet: string;
  data: InfluencerRecord[];
  columns: DynamicColumn[];
}

const normalizeHeaderKey = (header: string): string => {
  const clean = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean === 'name' || clean.includes('influencername')) return 'name';
  if (clean.includes('channel')) return 'channelName';
  if (clean.includes('product')) return 'product';
  if (clean.includes('insta')) return 'instagram';
  if (clean.includes('youtu') || clean.includes('yt')) return 'youtube';
  if (clean.includes('twit') || clean.includes('x.com')) return 'twitter';
  if (clean.includes('lang')) return 'language';
  if (clean.includes('barter') || clean.includes('returnable')) return 'barterStatus';
  if (clean.includes('ordermade')) return 'orderMade';
  if (clean.includes('orderdate') || (clean.includes('date') && !clean.includes('received') && !clean.includes('pickup') && !clean.includes('return'))) return 'orderDate';
  if (clean === 'received' || clean === 'recieved') return 'received';
  if (clean.includes('receiveddate') || clean.includes('recieveddate')) return 'receivedDate';
  if (clean.includes('video') || clean.includes('review')) return 'reviewVideoLink';
  if (clean.includes('tobereturn') || clean.includes('tobereturned')) return 'toBeReturned';
  if (clean.includes('pickup') || clean.includes('pickupdate')) return 'returnPickUpDate';
  if (clean.includes('pickedup')) return 'pickedUp';
  if (clean.includes('returnreceived') || clean.includes('returnrecieved')) return 'returnReceived';
  if (clean.includes('returnreceiveddate') || clean.includes('returnrecieveddate')) return 'returnReceivedDate';
  if (clean.includes('email') || clean.includes('mail')) return 'email';
  if (clean.includes('phone') || clean.includes('mobile') || clean.includes('contact')) return 'phone';
  if (clean.includes('address') || clean.includes('location')) return 'address';
  
  return header.trim();
};

export const readExcelOrCsvFile = (file: File): Promise<ParsedSheetData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const sheetNames = workbook.SheetNames;
        
        if (!sheetNames || sheetNames.length === 0) {
          throw new Error('No sheets found in file');
        }

        const firstSheetName = sheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          resolve({
            sheetNames,
            activeSheet: firstSheetName,
            data: [],
            columns: DEFAULT_COLUMNS
          });
          return;
        }

        const rawHeaders = Object.keys(rawJson[0]);
        const keyMap: Record<string, string> = {};
        const detectedColumns: DynamicColumn[] = [...DEFAULT_COLUMNS];

        rawHeaders.forEach(header => {
          const mappedKey = normalizeHeaderKey(header);
          keyMap[header] = mappedKey;

          const isStandard = DEFAULT_COLUMNS.some(c => c.key === mappedKey);
          if (!isStandard && !detectedColumns.some(c => c.key === mappedKey)) {
            detectedColumns.push({
              key: mappedKey,
              label: header.trim(),
              type: 'text',
              isCustom: true
            });
          }
        });

        const parsedRecords: InfluencerRecord[] = rawJson.map((row, index) => {
          const record: InfluencerRecord = {
            id: `imported-${Date.now()}-${index}`,
            name: '',
            channelName: '',
            instagram: '',
            youtube: '',
            twitter: '',
            language: 'English',
            barterStatus: 'Barter',
            email: '',
            phone: '',
            address: '',
          };

          Object.keys(row).forEach(rawHeader => {
            const mappedKey = keyMap[rawHeader] || rawHeader;
            record[mappedKey] = row[rawHeader] !== undefined ? String(row[rawHeader]).trim() : '';
          });

          return record;
        });

        resolve({
          sheetNames,
          activeSheet: firstSheetName,
          data: parsedRecords,
          columns: detectedColumns
        });

      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

export const exportToExcel = (data: InfluencerRecord[], columns: DynamicColumn[], filename = 'Influencers_Data.xlsx') => {
  const exportRows = data.map(item => {
    const rowObj: Record<string, any> = {};
    columns.forEach(col => {
      rowObj[col.label] = item[col.key] || '';
    });
    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const colWidths = columns.map(col => ({ wch: Math.max(col.label.length + 4, 16) }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Influencers');
  XLSX.writeFile(workbook, filename);
};

export const exportToCsv = (data: InfluencerRecord[], columns: DynamicColumn[], filename = 'Influencers_Data.csv') => {
  const exportRows = data.map(item => {
    const rowObj: Record<string, any> = {};
    columns.forEach(col => {
      rowObj[col.label] = item[col.key] || '';
    });
    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadSampleTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
  const sampleRecords: InfluencerRecord[] = [
    {
      id: 's-1',
      name: 'Rajit Shankar Ghosh',
      channelName: 'Purecast 9',
      instagram: '',
      youtube: 'https://www.youtube.com/purecast9',
      twitter: 'https://x.com/Purecast9',
      language: 'English',
      barterStatus: 'Barter',
      email: 'purecast9@gmail.com',
      phone: '9831386610',
      address: 'Udayan Building 318/C, Kolkata 700107',
      product: 'Twistura Delta',
      orderMade: 'Yes',
      orderDate: '6 May',
      received: 'Yes',
      receivedDate: '8 May',
      reviewVideoLink: 'https://www.youtube.com/watch?v=3nH2VkbwLjs'
    }
  ];

  if (format === 'xlsx') {
    exportToExcel(sampleRecords, DEFAULT_COLUMNS, 'Influencers_Template.xlsx');
  } else {
    exportToCsv(sampleRecords, DEFAULT_COLUMNS, 'Influencers_Template.csv');
  }
};
