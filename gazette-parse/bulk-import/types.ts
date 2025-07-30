type GazetteMetadata = {
	title: string;
	category: string;
	subCategory: string;
	notificationNum?: string;
	publishDate: string;
	publishTime: string;
};

export type SearchRecord = Omit<
	GazetteMetadata & {
		objectID: string;
		objectGroup: string;
		publishTimestamp: number;
		fileUrl: string;
		publishYear: number;
		publishMonth: number;
		publishDay: number;
	},
	"publishTime"
>;
