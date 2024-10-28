WITH valid_versions AS (
	SELECT DISTINCT
		"blobId"
	FROM
		"Version"
	WHERE
		id IN( SELECT DISTINCT
				"publishedVersionId" FROM "Resource"
			WHERE
				"publishedVersionId" IS NOT NULL
			UNION
			SELECT DISTINCT
				"draftBlobId" FROM "Resource"
			WHERE
				"draftBlobId" IS NOT NULL)
),
blobs_with_table_header AS (
	SELECT
		*
	FROM
		"Blob"
	WHERE
		jsonb_path_exists ("content",
			'$.** ? (@.type == "tableHeader" && @.content[*].type != "paragraph")')
)
SELECT
	*
FROM
	blobs_with_table_header
WHERE
	id IN(
		SELECT
			"blobId" FROM valid_versions);