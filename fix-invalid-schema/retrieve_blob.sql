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
		-- image with no src
		-- NOTE: will throw false positives since some instances we just need { type: 'image' }
		OR jsonb_path_exists ("content",
			'$.** ? (@.type == "image" && (@.src == null || !exists(@.src)))')
		-- infocards with no title
		OR jsonb_path_exists ("content",
			'$.** ? (@.type == "infocards" && (@.title == null || !exists(@.title)))')
)

SELECT
	*
FROM
	blobs_with_invalid_schema
	LEFT JOIN "Version" ON blobs_with_invalid_schema.id = "Version"."blobId"
WHERE
	blobs_with_invalid_schema.id IN(
		SELECT
			"blobId" FROM valid_versions)
ORDER BY
	blobs_with_invalid_schema.id ASC;