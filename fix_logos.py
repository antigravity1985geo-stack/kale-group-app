import sys

with open('src/pages/CheckoutPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Use line-based replacement since we know exact line numbers
lines = content.splitlines(keepends=True)

# Lines 289-305 (0-indexed: 288-304) = BOG + TBC buttons
# Lines 312-319 (0-indexed: 311-318) = Credo button

# Build new BOG button (24 spaces indent)
new_bog_tbc = (
    '                            {/* BOG Pay */}\r\n'
    '                            <button \r\n'
    '                              onClick={() => handlePayment(\'bog\', \'full\')} \r\n'
    '                              disabled={isProcessingPayment} \r\n'
    '                              className="flex items-center justify-between p-5 bg-white border-2 border-brand-100 rounded-2xl hover:border-[#E8480C] hover:shadow-lg group transition-all disabled:opacity-50"\r\n'
    '                            >\r\n'
    '                              <div className="flex items-center gap-3">\r\n'
    '                                <svg width="52" height="34" viewBox="0 0 130 85" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 rounded-lg">\r\n'
    '                                  <rect width="130" height="85" rx="6" fill="#E8480C"/>\r\n'
    '                                  <text x="65" y="38" textAnchor="middle" dominantBaseline="middle" fill="white" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="28">BOG</text>\r\n'
    '                                  <text x="65" y="67" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontFamily="Arial, sans-serif" fontSize="11">\u10e1\u10d0\u10e5\u10d0\u10e0\u10d7\u10d5\u10d4\u10da\u10dd\u10e1 \u10d1\u10d0\u10dc\u10d9\u10d8</text>\r\n'
    '                                </svg>\r\n'
    '                                <div className="text-left">\r\n'
    '                                  <p className="font-bold text-brand-900 text-sm">BOG Pay</p>\r\n'
    '                                  <p className="text-[10px] text-brand-400">\u10e1\u10e0\u10e3\u10da\u10d8 \u10d2\u10d0\u10d3\u10d0\u10ee\u10d3\u10d0</p>\r\n'
    '                                </div>\r\n'
    '                              </div>\r\n'
    '                              <ChevronRight size={18} className="text-brand-300 group-hover:translate-x-1 group-hover:text-[#E8480C] transition-all flex-shrink-0"/>\r\n'
    '                            </button>\r\n'
    '                            \r\n'
    '                            {/* TBC Pay */}\r\n'
    '                            <button \r\n'
    '                              onClick={() => handlePayment(\'tbc\', \'full\')} \r\n'
    '                              disabled={isProcessingPayment} \r\n'
    '                              className="flex items-center justify-between p-5 bg-white border-2 border-brand-100 rounded-2xl hover:border-[#00AEEF] hover:shadow-lg group transition-all disabled:opacity-50"\r\n'
    '                            >\r\n'
    '                              <div className="flex items-center gap-3">\r\n'
    '                                <svg width="52" height="34" viewBox="0 0 130 85" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 rounded-lg">\r\n'
    '                                  <rect width="130" height="85" rx="6" fill="#00AEEF"/>\r\n'
    '                                  <text x="65" y="38" textAnchor="middle" dominantBaseline="middle" fill="white" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="28">TBC</text>\r\n'
    '                                  <text x="65" y="67" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontFamily="Arial, sans-serif" fontSize="11">TBC Bank</text>\r\n'
    '                                </svg>\r\n'
    '                                <div className="text-left">\r\n'
    '                                  <p className="font-bold text-brand-900 text-sm">TBC Pay</p>\r\n'
    '                                  <p className="text-[10px] text-brand-400">\u10e1\u10e0\u10e3\u10da\u10d8 \u10d2\u10d0\u10d3\u10d0\u10ee\u10d3\u10d0</p>\r\n'
    '                                </div>\r\n'
    '                              </div>\r\n'
    '                              <ChevronRight size={18} className="text-brand-300 group-hover:translate-x-1 group-hover:text-[#00AEEF] transition-all flex-shrink-0"/>\r\n'
    '                            </button>\r\n'
)

new_credo = (
    '                         {/* Credo Bank */}\r\n'
    '                         <button \r\n'
    '                            onClick={() => handlePayment(\'credo\', \'installment\')} \r\n'
    '                            disabled={isProcessingPayment} \r\n'
    '                            className="w-full flex items-center justify-between p-5 bg-white border-2 border-brand-100 rounded-2xl hover:border-[#0081C5] hover:shadow-lg group transition-all disabled:opacity-50"\r\n'
    '                          >\r\n'
    '                            <div className="flex items-center gap-3">\r\n'
    '                              <svg width="52" height="34" viewBox="0 0 130 85" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 rounded-lg">\r\n'
    '                                <rect width="130" height="85" rx="6" fill="#0081C5"/>\r\n'
    '                                <text x="65" y="36" textAnchor="middle" dominantBaseline="middle" fill="white" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="22">CREDO</text>\r\n'
    '                                <text x="65" y="63" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontFamily="Arial, sans-serif" fontSize="11">Bank</text>\r\n'
    '                              </svg>\r\n'
    '                              <div className="text-left">\r\n'
    '                                <p className="font-bold text-brand-900 text-sm">Credo Bank \u10d2\u10d0\u10dc\u10d5\u10d0\u10d3\u10d4\u10d1\u10d0</p>\r\n'
    '                                <p className="text-[10px] text-brand-400">\u10d2\u10d0\u10dc\u10d5\u10d0\u10d3\u10d4\u10d1\u10d0 \u2014 0%</p>\r\n'
    '                              </div>\r\n'
    '                            </div>\r\n'
    '                            <ChevronRight size={18} className="text-brand-300 group-hover:translate-x-1 group-hover:text-[#0081C5] transition-all flex-shrink-0"/>\r\n'
    '                          </button>\r\n'
)

# Replace lines 289-305 (0-indexed 288-304) with BOG+TBC
# Replace lines 312-319 (0-indexed 311-318) with Credo

# Do credo first (higher line numbers)
new_lines = lines[:311] + [new_credo] + lines[319:]
# Now BOG+TBC (lines 289-305, 0-indexed 288-304)
final_lines = new_lines[:288] + [new_bog_tbc] + new_lines[305:]

with open('src/pages/CheckoutPage.tsx', 'w', encoding='utf-8') as f:
    f.write(''.join(final_lines))

print("Done! Lines replaced successfully.")
