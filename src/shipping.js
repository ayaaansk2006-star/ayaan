// Courier charge per order, by Indian pincode prefix (India Post zones). First match wins, so specific prefixes come first.
// ponytail: prefix ranges are approximate at district borders; swap for a full pincode table if a customer is mis-charged.
const RULES = [
  [/^(400|401|421)/, 100, 'Mumbai / Thane / Mumbra'],
  [/^403/, 200, 'Goa'],
  [/^4[0-4]/, 150, 'Maharashtra'],
  [/^3[6-9]/, 250, 'Gujarat'],
  [/^60[0-3]/, 300, 'Chennai'],
  [/^56[0-2]/, 300, 'Bangalore'],
  [/^57[4-6]/, 300, 'Mangalore'],
  [/^5[1-3]/, 300, 'Andhra Pradesh'],
  [/^6[7-9]/, 300, 'Kerala'],
  [/^(80\d|81[0-3]|84\d|85[0-5])/, 300, 'Bihar'],
  [/^737/, 350, 'Sikkim'],
  [/^7[0-4]/, 350, 'West Bengal'],
  [/^7[5-7]/, 350, 'Odisha'],
  [/^78/, 350, 'Assam'],
  [/^2013/, 350, 'Noida'],
  [/^(11|12[12]|2010)/, 300, 'Delhi NCR'],
  [/^1[23]/, 300, 'Haryana'],
  [/^1[4-6]/, 300, 'Punjab']
];
const REST = [350, 'Rest of India'];

function quote(pincode) {
  const pin = String(pincode || '').trim();
  if (!/^[1-8]\d{5}$/.test(pin)) return null;
  const [, fee, zone] = RULES.find(([re]) => re.test(pin)) || [null, ...REST];
  return { fee, zone };
}

module.exports = { quote };
