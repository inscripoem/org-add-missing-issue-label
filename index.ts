import dotenv from "dotenv";
import { Octokit } from "octokit";

// Load environment variables
dotenv.config();

// Check if required environment variables exist
if (!process.env.GITHUB_AUTH_TOKEN || !process.env.GITHUB_ORG_NAME) {
	console.error("Error: Required environment variables are not set!");
	console.error(
		"Please make sure GITHUB_AUTH_TOKEN and GITHUB_ORG_NAME are set in your .env file",
	);
	process.exit(1);
}

// Define Label class
class Label {
	constructor(
		public name: string,
		public color: string,
	) {}
}

// Predefined list of labels using Label class instances
const predefinedLabels: Label[] = [
	new Label("Prio: High", "CA49BC"),
	new Label("Prio: Medium", "AF98C6"),
	new Label("Prio: Low", "FDF3BF"),
];

// Create Octokit instance
const octokit = new Octokit({
	auth: process.env.GITHUB_AUTH_TOKEN,
});

// Get organization name from environment variables
const orgName = process.env.GITHUB_ORG_NAME;

async function addMissingLabelsToRepos() {
	try {
		// Get all repositories in the organization
		console.log(`Fetching repositories for organization: ${orgName}...`);
		const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
			org: orgName,
			per_page: 100,
		});

		console.log(`Found ${repos.length} repositories in total.`);
		let processedRepos = 0;

		for (const repo of repos) {
			const { owner, name } = repo;
			processedRepos++;
			console.log(
				`\nProcessing repository ${processedRepos}/${repos.length}: ${owner.login}/${name}`,
			);

			// Get existing labels for the repository
			const existingLabels = await octokit.paginate(
				octokit.rest.issues.listLabelsForRepo,
				{
					owner: owner.login,
					repo: name,
					per_page: 100,
				},
			);

			const existingLabelNames = existingLabels.map(
				(label: { name: string }) => label.name,
			);

			// Find labels that need to be added
			const labelsToAdd = predefinedLabels.filter(
				(label) => !existingLabelNames.includes(label.name),
			);

			if (labelsToAdd.length > 0) {
				console.log(`Found ${labelsToAdd.length} missing labels to add.`);
				let addedCount = 0;
				for (const label of labelsToAdd) {
					// Add missing label to the repository
					await octokit.rest.issues.createLabel({
						owner: owner.login,
						repo: name,
						name: label.name,
						color: label.color,
					});
					addedCount++;
					console.log(
						`  ✓ Added label '${label.name}' (${addedCount}/${labelsToAdd.length})`,
					);
				}
				console.log(
					`✓ Successfully added ${addedCount} labels to ${owner.login}/${name}`,
				);
			} else {
				console.log(
					`→ Skipping ${owner.login}/${name} - all predefined labels already exist`,
				);
			}

			// Show progress percentage
			const progress = ((processedRepos / repos.length) * 100).toFixed(2);
			console.log(
				`Progress: ${progress}% (${processedRepos}/${repos.length} repositories processed)`,
			);
		}

		console.log("\nOperation completed successfully!");
		console.log(`Processed ${repos.length} repositories in total.`);
	} catch (error) {
		console.error("Error:", error);
	}
}

// Run the program
addMissingLabelsToRepos();
