const axios = require('axios');
const cheerio = require('cheerio');
const HttpStatus = require('http-status-codes');
const fs = require('fs');

/**
 * Determines whether the given error was generated by Axios.
 *
 * We can't use 'instanceof' with Axios errors because axios
 * doesn't define its own Error classes. Rather, it sets
 * an 'isAxiosErorr' property on the errors it throws, which
 * we are responsible for checking.
 *
 * Axios will throw an error for all 4xx and 5xx HTTP statuses.
 */
function isAxiosError(error) {
  return error && error.isAxiosError;
}

// Define urls used for this scrape
let baseUrl = 'https://www.davidson.edu';
const DEPARTMENTS_PATH = '/academic-departments';


// Utility function to get webpage data and load into cheerio
const loadData = (baseUrl, path) => {
  let url = baseUrl + path;

  console.log(`Fetching data from: ${url}`);

  return axios.get(url).then(result => cheerio.load(result.data));
}


// Scrape Academic Department names and url's from https://davidson.edu/academic-departments
const getDepartmentPaths = async () => {
  console.log('Function getDepartmentPaths has started');
  const $ = await loadData(baseUrl, DEPARTMENTS_PATH);

  return Array.from($('a', '.three-column').map((i, listItem) => {
    return {name: listItem.children[0].data, path: listItem.attribs.href, departmentUrl: baseUrl + listItem.attribs.href};
  }));
}

// For a specific faculty member, scrape their information from the department faculty/staff page
function getDeptFacultyInfoFromListItem(baseUrl, listItem) {
  const $ = cheerio;
  let facultyNode  = $(listItem);

  let contactInfo = Array.from(facultyNode.find('.person-teaser__contact a').map((i, element) => {
    return element.children;
  }));

  // Return object for each faculty member
  return {
    name: facultyNode.find('.person-teaser__name').text().trim(),
    titles: facultyNode.find('.person-teaser__titles').text().trim(),
    expertiseAreas: Array.from(facultyNode.find('.person-teaser__list li').map((i, element) => {
      return element.children[0].data;
    })),
    email: (contactInfo[1] ? contactInfo[0].data : null),
    phone: (contactInfo[1] ? contactInfo[1].data : contactInfo[0].data),
    office: facultyNode.find('div .person-teaser__contact').find('div').text().trim(),
    imageUrl: baseUrl  + facultyNode.find('img').attr('src'),
    profileUrl: baseUrl + facultyNode.find('.person-teaser__name a').attr('href')
  };
}

// Map the above function to all faculty members listed for the given department
const getDeptFaculty = async (baseUrl, deptPath) => {
  try {

    const $ = await loadData(baseUrl, deptPath + '/faculty-staff');

    return $('.person-teaser').map(function() {
      return getDeptFacultyInfoFromListItem(baseUrl, this);
    }).toArray();
  } catch (err) {
    if (!isAxiosError(err)) { throw err; }

    switch(err.response.status) {
      case HttpStatus.NOT_FOUND:
        return null;
      default:
        throw err;
    }
  }
}

// For a specific link listed on the sidebar of the department page, return object with its label and url
function getLinkInfoFromListItem(baseUrl, listItem) {
  const $ = cheerio;
  let itemNode = $(listItem);

  return {
    label: itemNode.find('a').text(),
    url: baseUrl + itemNode.find('a').attr('href'),
  }
}

// Map the above function to all links listed on the department sidebar (top-level only)
async function getDeptLinkInfo(baseUrl, deptPath) {
  try {
    const $ = await loadData(baseUrl, deptPath);
    return $('.menu--expanded > li').map(function() {
      return getLinkInfoFromListItem(baseUrl, this);
    }).toArray();
  } catch (err) {
    if (!isAxiosError(err)) { throw err; }
    switch(err.response.status) {
      case HttpStatus.NOT_FOUND:
        return null;
      default:
        throw err;
    }
  }
}

// Run script with all of the functions above, returning all departments with their data
let run = async () => {
  let departments = await getDepartmentPaths();
  console.log(departments);

  return Promise.all(departments.map(async(dept) => {
    dept.faculty = await getDeptFaculty(baseUrl, dept.path);
    dept.links = await getDeptLinkInfo(baseUrl, dept.path);
    return dept;
  }));
}

run()
  .then(departments => {
    // Log resulting array to the console
    console.log(departments);
    // Write the data into a JSON file using fs.writeFileSync and JSON.stringify
    fs.writeFileSync('davidsonDepartments.json', JSON.stringify(departments));
  })
  .catch(err => {
    console.log(err.stack);
  });
