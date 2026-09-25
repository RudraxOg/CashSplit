const CURRENCIES = ['INR','USD','EUR','GBP','AUD','CAD','SGD'];
function currencyCode(value = 'INR') {
  if (!CURRENCIES.includes(value)) throw Object.assign(new Error('Unsupported currency'), { statusCode: 400 });
  return value;
}
module.exports = { CURRENCIES, currencyCode };
