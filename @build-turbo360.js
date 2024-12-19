const process = require('process');
const fs = require('fs-extra');
const child_process = require('child_process');
const shell = require('shelljs');
const argv = require('minimist')(process.argv.slice(1));

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
      `${CR}Unable to clone Turbo 360 Base Net.Create Template - do you have access?${TR}:`
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

  // console.log(PR, `Copying resources (using template: ${template})`);
  // fs.copySync(`./templates/${template}/resources`, './dist/public/resources');

  console.log(PR, `${CY}Turbo-360 packaging complete${TR}`);
  console.log(
    PR,
    `To deploy, type ${CY}npm run deploy-turbo360${TR} and follow the prompts`
  );
}

function f_DeployWebTurbo360() {
  console.log(PR, `Deploying to ${CY}Turbo-360${TR}...`);

  console.log(PR, 'Installing/updating Turbo-360 CLI tools');
  let res = shell.exec('npm i -g @turbo360/cli', { silent: true });
  if (res.code !== 0) {
    console.error(PR, 'Unable to globally install the Turbo-360 CLI tools');
    console.error(PR, `\t${res.error}`);
    process.exit(1);
  }

  console.log(PR, `Beginning Turbo-360 deployment...`);
  shell.cd('./dist');

  try {
    child_process.execFileSync('turbo', ['connect'], { stdio: 'inherit' });
  } catch (err) {
    console.error(PR, 'Unable to connect your local project to Turbo 360');
    console.error(PR, `\t${err}`);
    process.exit(1);
  }

  res = shell.exec('turbo deploy');
  if (res.code !== 0) {
    console.error(PR, 'There was an error during Turbo 360 server deployment:');
    console.error(PR, `\t${res.error}`);
    process.exit(1);
  }

  res = shell.exec('turbo deploy -t static');
  if (res.code !== 0) {
    console.error(PR, 'There was an error during Turbo 360 asset deployment');
    console.error(PR, `\t${res.error}`);
    process.exit(1);
  }

  shell.cd(__dirname);
}

function u_checkError(execResults) {
  if (!execResults.stderr) return;
  console.log(`${CR}*** ERROR IN MEME EXEC ***${TR}`);
  console.log(execResults.stderr);
  process.exit(0);
}
