import { Category } from "./constants";

type CsvFileMapping = {
	[string: string]: {
		category: string;
		subCategory?: string;
		folderName: string;
	};
};

export const csvFileMapping: CsvFileMapping = {
	"egazette-as.2024.csv": {
		category: Category.LegislativeSupplements,
		subCategory: "Acts Supplement",
		folderName: "as",
	},
	"egazette-bs.2024.csv": {
		category: Category.LegislativeSupplements,
		subCategory: "Bills Supplement",
		folderName: "bs",
	},
	"egazette-irs.2024.csv": {
		category: Category.OtherSupplements,
		subCategory: "Industrial Relations Supplement",
		folderName: "irs",
	},
	"egazette-sgg.2024.csv": {
		category: Category.OtherSupplements,
		subCategory: "Government Gazette Supplement",
		folderName: "sgg",
	},
	"egazette-sl.2024.csv": {
		category: Category.LegislativeSupplements,
		subCategory: "Revised Subsidiary Legislation",
		folderName: "sl",
	},
	"egazette-sls.2024.csv": {
		category: Category.LegislativeSupplements,
		subCategory: "Subsidiary Legislation Supplement",
		folderName: "sls",
	},
	"egazette-statutes.2024.csv": {
		category: Category.LegislativeSupplements,
		subCategory: "Revised Acts",
		folderName: "statutes",
	},
	"egazette-tms.2024.csv": {
		category: Category.OtherSupplements,
		subCategory: "Trade Marks Supplement",
		folderName: "tms",
	},
	"egazette-ts.2024.csv": {
		category: Category.OtherSupplements,
		subCategory: "Treaties Supplement",
		folderName: "ts",
	},
	"egazette-gg.2024.csv": {
		category: Category.GovernmentGazette,
		folderName: "gg",
	},
	"2025-07-recovered-gazettes-gg.csv": {
		category: Category.GovernmentGazette,
		folderName: "gg",
	},
	"2025-07-recovered-gazettes-os-irs.csv": {
		category: Category.OtherSupplements,
		subCategory: "Industrial Relations Supplement",
		folderName: "os-irs",
	},
};

type SubCategoryMapping = {
  [string: string]: string;
};

export const subCategoryMapping: SubCategoryMapping = {
  Advertisements: "Advertisements",
  Appointments: "Appointments",
  "Audited Reports": "Audited Reports",
  "Cessation of Service": "Cessation of Service",
  Corrigendum: "Corrigendum",
  Death: "Death",
  Dismissals: "Dismissals",
  Leave: "Leave",
	"Notices (Bankruptcy Act)": "Notices (Bankruptcy Act)",
	"Notices (Companies Act)": "Notices (Companies Act)",
	"Notices (Constitution)": "Notices (Constitution)",
	"Notices (other Acts)": "Notices (other Acts)",
  "Notices under the Bankruptcy Act": "Bankruptcy Act Notice",
  "Notices under the Companies Act": "Companies Act Notice",
  "Notices under the Constitution": "Notices under the Constitution",
  "Notices under various other Acts": "Notices under other Acts",
  Others: "Others",
  Revocation: "Revocation",
  Tenders: "Tenders",
  "Termination of Service": "Termination of Service",
  "Vacation of Service": "Vacation of Service",
};

type MetadataColumnMapping = {
  [string: string]: number;
};

export const metadataColumnMapping: MetadataColumnMapping = {
  Year: 0,
  NotificationNumber: 1,
  FileName: 3,
  Title: 4,
  PublishDate: 8,
  SubCategory: 7,
};