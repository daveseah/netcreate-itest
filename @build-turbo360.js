const process = require('process');
const fs = require('fs-extra');
const child_process = require('child_process');
const shell = require('shelljs');
const argv = require('minimist')(process.argv.slice(1));
const dotenv = require('dotenv');

const PR = 'BUILD\t';
const TR = '\x1b[0m';
const CY = '\x1b[33m';
const CR = '\x1b[41m';

if (!shell.which('git')) {
  shell.echo(
    `\x1b[30;41m You must have git installed to run the net.create/Turbo360 devtool \x1b[0m`
  );
  shell.exit(0);
}

const param1 = argv._[1];

switch (param1) {
  case 'package-turbo360':
    f_PackageWebTurbo360(argv._[2]);
    break;
  case 'deploy-turbo360':
    f_DeployWebTurbo360();
    break;

  default:
    console.log(`${PR}\n- unknown command '${param1}'\n`);
}

function f_PackageWebTurbo360(template = '_blank') {
  console.log(`\n`);
  console.log(PR, `packaging for ${CY}Turbo-360${TR}`);
  console.log(PR, `erasing ./public and ./dist directories`);
  shell.rm('-rf', './dist', './public');
  console.log(PR, `compiling web into ./public`);

  // Package the net.create application in "standalone" mode
  let res = shell.exec(`npx brunch build -e package`, { silent: true });
  u_checkError(res);

  // Prepare a local copy of the Turbo360 NodeJS/Express base template
  // See: https://github.com/Vertex-Labs/base-template-netcreate
  console.log(
    PR,
    `cloning latest ${CY}Turbo-360${TR} net.create base template into ./dist`
  );
  res = shell.exec(
    'git clone https://github.com/Vertex-Labs/base-template-netcreate.git dist',
    { silent: true }
  );
  if (res.code !== 0) {
    console.error(
      PR,
      `${CR}Unable to clone Turbo 360 Base Template - do you have access?${TR}:`
    );
    process.exit(1);
  }

  console.log(PR, `installing ${CY}Turbo-360${TR} Node dependencies...`);
  shell.cd('./dist');
  res = shell.exec('npm i --omit=dev', { silent: true });
  if (res.code !== 0) {
    console.error(
      PR,
      `${CR}Unable to install Turbo 360 Base Template NodeJS dependencies${TR}`
    );
    console.error(PR, `\t${res.stderr}`);
    process.exit(1);
  }
  shell.cd(__dirname);

  console.log(PR, `Copying web-app...`);
  // Copy the created net.create web-app bundle into the template
  fs.copySync('./public', './dist/public');
  fs.moveSync('./dist/public/index.ejs', './dist/views/home.html');
  fs.removeSync('./dist/public/index.html');

  // TODO: Consider copying TOML and other files
  // console.log(PR, `Copying resources (using template: ${template})`);
  // fs.copySync(`./templates/${template}/resources`, './dist/public/resources');

  console.log(PR, `${CY}Turbo-360 packaging complete${TR}`);
  console.log(
    PR,
    `To deploy, type ${CY}npm run deploy-turbo360${TR} and follow the prompts`
  );
}

function f_DeployWebTurbo360() {
  let res = 0;

  console.log(PR, `Welcome to the Turbo-360 Deployment Tool!`);
  console.log(PR, `Please select the ${CY}Turbo-360${TR} project to deploy to:`);

  // First, connect the local project:
  shell.cd('./dist');

  try {
    child_process.execFileSync('npx turbo', ['connect'], {
      stdio: 'inherit',
      shell: true
    });
  } catch (err) {
    if (err.status !== 0) {
      f_HandleDeployError(res.code);
      process.exit(1);
    }
  }

  // .env file contains the slug
  if (!fs.existsSync('.env')) {
    console.log(
      PR,
      `You must connect your local project to a Turbo-360 project by selecting an option`
    );
    process.exit(1);
  }

  const { TURBO_PROJECT = null, TURBO_PROJECT_SLUG = null } = dotenv.parse(
    fs.readFileSync('.env') ?? ''
  );

  // Second, do the two deployment steps:
  console.log(
    PR,
    `Deploying to ${CY}Turbo-360${TR} Project ${CY}${TURBO_PROJECT}${TR}`
  );

  console.log(PR, `Beginning Turbo-360 deployment...`);
  console.log(PR, `Please wait, this process may take several minutes....`);
  try {
    res = shell.exec('npx turbo deploy', { silent: true });
    if (res.code !== 0) {
      f_HandleDeployError(res.code);
      process.exit(1);
    }

    res = shell.exec('npx turbo deploy -t static', { silent: true });
    if (res.code !== 0) {
      f_HandleDeployError(res.code);
      process.exit(1);
    }

    const url = `https://${TURBO_PROJECT_SLUG}.turbo360-staging.com`;
    console.log(
      '\nDeployment complete, you can access the site using the following URLs:'
    );
    console.log(`\tApplication: ${url}/`);
  } catch (err) {
    // Unexpected errors
    console.log(PR, `unexpected error during Turbo-360 deployment: ${err}`);
    process.exit(-1);
  } finally {
    shell.cd(__dirname);
  }

  // Local function
  function f_HandleDeployError(exitCode) {
    if (exitCode) {
      // FUTURE: This should ideally be exported from the CLI tool, or alternatively, the CLI tool
      //  should expose a programmatic interface rather than mediate this through the shell
      const TURBO360_ERRORS = {
        // General errors
        UNSPECIFIED: { exitCode: 1 },
        INVALID_PARAMS: { exitCode: 2 },
        NOT_LOGGED_IN: { exitCode: 3 },

        // Deploy-specific errors
        PROJECT_NOT_CONNECTED: { exitCode: 100 },
        PROJECT_NOT_FOUND: { exitCode: 101 },
        NOT_AUTHORIZED: { exitCode: 102 }
      };

      // Non-zero exit code, interpret it
      switch (exitCode) {
        case TURBO360_ERRORS.NOT_LOGGED_IN:
          console.log(PR, `You must log in to ${CY}Turbo-360${TR} to deploy.`);
          break;

        case TURBO360_ERRORS.PROJECT_NOT_CONNECTED:
          console.log(
            PR,
            `Your local codebase must be connected to a ${CY}Turbo-360${TR} project to continue.`
          );
          break;

        case TURBO360_ERRORS.PROJECT_NOT_FOUND:
        case TURBO360_ERRORS.NOT_AUTHORIZED:
          console.log(
            PR,
            `The specified ${CY}Turbo-360${TR} project does not exist or you do not have access to it.`
          );
          break;

        default:
          // All other errors
          console.log(
            PR,
            `Unexpected error while performing the ${CY}Turbo-360${TR} deployment: ${exitCode}.`
          );
          break;
      }

      console.log(
        PR,
        `\tPlease review the ${CY}Turbo-360${TR} deployment notes in ${CY}README-Turbo360.md${TR}`
      );
    }
  }
}

function u_checkError(execResults) {
  if (!execResults.stderr) return;
  console.log(`${CR}*** ERROR IN NETCREATE EXEC ***${TR}`);
  console.log(execResults.stderr);
  process.exit(0);
}
