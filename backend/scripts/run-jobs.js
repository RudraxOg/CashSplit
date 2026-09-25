require('../src/config');
const { runDue } = require('../src/services/expenseSeries');
const { queueReminders, deliver, smtpTransport } = require('../src/services/notificationWorker');
async function runJobs() {
  await queueReminders();
  const recurring = await runDue();
  const transport = smtpTransport();
  try { return { ...recurring, ...await deliver(transport), emailConfigured: Boolean(transport) }; }
  finally { transport?.close(); }
}
if (require.main === module) runJobs().then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { runJobs };
