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
blobs_with_invalid_schema AS (
	SELECT
		*
	FROM
		"Blob"
	WHERE
		-- table header with non-paragraph content
		jsonb_path_exists ("content",
			'$.** ? (@.type == "tableHeader" && @.content[*].type != "paragraph")')
		-- prose with no content
		OR jsonb_path_exists ("content",
			'$.** ? (@.type == "prose" && @.content.type() == "array" && @.content.size() == 0)')
		-- heading with no content
		OR jsonb_path_exists ("content",
			'$.** ? (@.type == "heading" && @.attrs.type() == "object" && @.attrs.level == 1)')
)

SELECT
	*
FROM
	blobs_with_invalid_schema
	left join "Version" on blobs_with_invalid_schema.id = "Version"."blobId"
WHERE
	blobs_with_invalid_schema.id IN(
		SELECT
			"blobId" FROM valid_versions)
ORDER BY
	blobs_with_invalid_schema.id ASC;