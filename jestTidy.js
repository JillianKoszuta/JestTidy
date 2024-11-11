const normalizePath = (filePath) => filePath.replace(/\\/g, '/'); // Convert backslashes to forward slashes;

const camelCaseToReadableLowerCase = (str) => {
	return str
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2') // Add space before capital letters
		.replace(/-/g, ' ') // remove '-' replace with a space. "job-order" => "job order"
		.replace(/([A-Z])/g, (letter) => letter.toLowerCase()); // Convert all uppercase letters to lowercase
};

const filePathLengths = [];
let shortestPath = null;

const createFolderReadableName = (filePath) => {
	const normalizedPath = normalizePath(filePath);
	const segments = normalizedPath.split('/');

	if (segments.length < shortestPath || shortestPath == null) {
		shortestPath = segments.length;
	}

	const shortPath = segments.slice(shortestPath - 2, segments.length - 1);
	console.log(shortPath.join(' / '));

	// Return the formatted readable name
	return camelCaseToReadableLowerCase(shortPath.join(' / ')).replace(
		/^([a-z])/,
		(match) => match.toUpperCase()
	);
};

const createReadableFileName = (filePath) => {
	const normalizedPath = normalizePath(filePath);
	const segments = normalizedPath.split('/');

	// Get the last two segments (parent folder and file name)
	const fileName = segments[segments.length - 1].split('.')[0]; // File name without extension

	const readableFileName = camelCaseToReadableLowerCase(fileName);

	// Return the formatted readable name
	return readableFileName;
};

function createAccordion(groupedData) {
	let accordionHtml = `<div class="accordion" id="accordionExample">`;

	groupedData.forEach((group, groupIndex) => {
		// Check if any file in the folder has failed tests
		const hasFailedTestsInFolder = group.testFiles.some((file) =>
			file.assertionResults.some((result) => result.status === 'failed')
		);

		// Folder title with a red dot if any file has failed tests
		const folderButtonClass = hasFailedTestsInFolder
			? 'accordion-button text-danger'
			: 'accordion-button';
		const redDot = hasFailedTestsInFolder
			? '<span class="badge bg-danger ms-2">*</span>'
			: '';

		const totalDuration = group.testFiles[0]?.assertionResults.reduce(
			(sum, result) => sum + (result.duration || 0),
			0
		);

		// Add data-group-title attribute to the accordion item
		accordionHtml += `
		<div class="accordion-item" data-group-title="${group.readableFolderName.toLowerCase()}">
			<h2 class="accordion-header" id="heading${groupIndex}">
				<button class="${folderButtonClass} collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${groupIndex}" aria-expanded="false" aria-controls="collapse${groupIndex}">
					${
						group.readableFolderName
					} ${redDot} <span class="text-muted ms-4 fst-italic" style="font-size: 0.85em;">${totalDuration} ms</span>
				</button>
			</h2>
			<div id="collapse${groupIndex}" class="accordion-collapse collapse" aria-labelledby="heading${groupIndex}" data-bs-parent="#accordionExample">
				<div class="accordion-body">`;

		// For each file in the folder
		group.testFiles.forEach((file, fileIndex) => {
			// Check if any test in the file has failed
			const hasFailedTests = file.assertionResults.some(
				(result) => result.status === 'failed'
			);

			// Add the 'text-danger' class if the file has failed tests
			const fileButtonClass = hasFailedTests
				? 'accordion-button text-danger'
				: 'accordion-button';

			// Add data-file-title attribute to the file accordion item
			accordionHtml += `
                <div class="accordion-item" data-file-title="${file.readableName.toLowerCase()}">
                    <h2 class="accordion-header" id="fileHeading${groupIndex}-${fileIndex}">
                        <button class="${fileButtonClass}" type="button" data-bs-toggle="collapse" data-bs-target="#fileCollapse${groupIndex}-${fileIndex}" aria-expanded="false" aria-controls="fileCollapse${groupIndex}-${fileIndex}">
                            ${file.readableName}
                        </button>
                    </h2>
                    <div id="fileCollapse${groupIndex}-${fileIndex}" class="accordion-collapse collapse" aria-labelledby="fileHeading${groupIndex}-${fileIndex}" data-bs-parent="#collapse${groupIndex}">
                        <div class="accordion-body">
                            <ul>`;

			// Add assertion results for the file
			file.assertionResults.forEach((result) => {
				const resultClass =
					result.status === 'passed' ? 'text-success' : 'text-danger'; // Green for passed, red for failed
				accordionHtml += `
                    <li class="${resultClass}">
                        <strong>${result.fullName}</strong> - Duration: ${result.duration}ms
                `;

				if (result.status === 'failed' && result.failureMessages) {
					accordionHtml += `
                        <div class="text-danger ms-3">
                            <small> ${result.failureMessages}</small>
                        </div>`;
				}

				accordionHtml += `</li>`;
			});

			accordionHtml += `
                        </ul>
                    </div>
                </div>
            </div>`;
		});

		accordionHtml += `
                    </div>
                </div>
            </div>`;
	});

	accordionHtml += '</div>'; // End the outer accordion
	return accordionHtml;
}

const replaceAccordian = (newBodyHtml) => {
	document.getElementById('accordion-container').innerHTML = newBodyHtml;
};

let jestData;

// Fetch project data from JSON file
fetch('jest-results.json')
	.then((response) => response.json())
	.then((data) => {
		const groupedData = (data?.testResults || []).reduce((acc, file) => {
			const normalizedPath = normalizePath(file.name);
			const directoryPath = normalizedPath.substring(
				0,
				normalizedPath.lastIndexOf('/')
			); // Get directory path up to the file name

			// Create the human-readable name for the file
			const readableName = createReadableFileName(file.name);

			file.readableName = readableName;

			// Check if a group with the same directory path already exists
			let group = acc.find((item) => item.path === directoryPath);

			if (group) {
				// If found, push the file to the existing group's files array
				group.testFiles.push(file);
			} else {
				// Otherwise, create a new group
				acc.push({
					path: directoryPath,
					testFiles: [file],
					readableFolderName: createFolderReadableName(file.name).replace(
						/^([a-z])/,
						(match) => match.toUpperCase()
					),
				});
			}

			return acc;
		}, []);

		jestData = groupedData;

		// replace the html inside the main div with new html created using the grouped data
		const newHtml = createAccordion(groupedData);
		replaceAccordian(newHtml);
	});

// Function to filter the accordion items based on the search input
function filterAccordions() {
	// get the search term, remove spaces, convert to lower case
	const searchTerm = document.getElementById('searchFilter').value;
	const searchStrippedAndLower = searchTerm.replace(/\s+/g, '').toLowerCase();

	const errorFilterValue = document.getElementById('errorCheckbox').checked;

	// copy by value instead of reference
	let listOfData = structuredClone(jestData);

	if (errorFilterValue === true) {
		// go thru list of grouped files
		const dataHasBeenFilteredForErrors = listOfData.filter((folder) => {
			// go thru that groups files
			const filesFilteredForErrors = folder.testFiles.filter((file) => {
				// go thru each files assertions
				const fileAssertionsFilteredForErrors = file.assertionResults.filter(
					(result) => {
						// remove all assertions where status is passed
						if (result.status === 'passed') {
							return false;
						} else {
							return true;
						}
					}
				);
				file.assertionResults = fileAssertionsFilteredForErrors;
				// remove all files with no remaining assertions
				if (fileAssertionsFilteredForErrors.length === 0) {
					return false;
				} else {
					return true;
				}
			});

			folder.testFiles = filesFilteredForErrors;

			// remove all groups with no remaining files
			if (filesFilteredForErrors.length === 0) {
				return false;
			} else {
				return true;
			}
		});

		listOfData = dataHasBeenFilteredForErrors;
	} else {
		listOfData = structuredClone(jestData);
	}

	const newData = listOfData.map((testFolderObject) => {
		const pathStrippedAndLower = testFolderObject.path
			.replace(/\s+/g, '')
			.toLowerCase();

		// if folder name matches, return entire object
		if (pathStrippedAndLower.includes(searchStrippedAndLower)) {
			return testFolderObject;
		}

		// if folder name does not match, filter test files array to only entries where either
		// A: file name matches searched term
		const fileNameMatches = testFolderObject.testFiles.filter((testFile) =>
			testFile.name
				.replace(/\s+/g, '')
				.toLowerCase()
				.includes(searchStrippedAndLower)
		);
		if (fileNameMatches.length > 0) {
			testFolderObject.testFiles = fileNameMatches;
			return testFolderObject;
		}

		// if folder name does not match, filter test files array to only entries where either
		// B: an assertion contains the searched term

		const testFilesWithAnAssertionMatch = testFolderObject.testFiles
			.map((testFile) => {
				const assertionMatches = testFile.assertionResults.filter(
					(assertion) => {
						return assertion.fullName
							.replace(/\s+/g, '')
							.toLowerCase()
							.includes(searchStrippedAndLower);
					}
				);

				if (assertionMatches.length > 0) {
					testFile.assertionResults = assertionMatches;
					console.log(testFile);
					return testFile;
				} else {
					return null;
				}
			})
			.filter((item) => !!item);

		if (testFilesWithAnAssertionMatch.length > 0) {
			testFolderObject.testFiles = testFilesWithAnAssertionMatch;
			return testFolderObject;
		} else {
			return null;
		}
	});

	const newHtml = createAccordion(newData.filter((item) => !!item));
	replaceAccordian(newHtml);
}

// Add event listener to search filter input field
document
	.getElementById('searchFilter')
	.addEventListener('input', filterAccordions);

document
	.getElementById('errorCheckbox')
	.addEventListener('input', filterAccordions);
