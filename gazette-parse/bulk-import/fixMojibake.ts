// this function fixes mojibake in the title column
// For example, if the title is "1234567890", it will be converted to "1234567890"
// If the title contains non-ascii characters, it will be converted to the correct characters
export const fixMojibake = (input: string): string => {
  return input
    // Single quotes
    .replace(/Ã‚â€™/g, "’")   // right single quote ’
    .replace(/Ã¢â‚¬Ëœ/g, "‘")  // left single quote ‘
    
    // Double quotes
    .replace(/Ã¢â‚¬Å“/g, "“")  // left double quote “
    .replace(/Ã¢â‚¬Â/g, "”")  // right double quote ”
    
    // Dashes
    .replace(/Ã¢â‚¬â€œ/g, "–")  // en dash –
    .replace(/Ã¢â‚¬â€/g, "—")  // em dash —
    
    // Ellipsis
    .replace(/Ã¢â‚¬Â¦/g, "…")  // ellipsis …
    
    // Misc punctuation
    .replace(/Â©/g, "©")
    .replace(/Â®/g, "®")
    .replace(/â„¢/g, "™")
    
    // Non-breaking space
    .replace(/Â /g, " ")
    
    // Common broken characters
    .replace(/ÃƒÂ©/g, "é")
    .replace(/ÃƒÂ¨/g, "è")
    .replace(/ÃƒÂª/g, "ê")
    .replace(/ÃƒÂ¢/g, "â")
    .replace(/ÃƒÂ /g, "à")
    .replace(/ÃƒÂ¹/g, "ù")
    .replace(/ÃƒÂ§/g, "ç")
    
    // Extra cleanup for stray replacement chars
    .replace(/�/g, "")
};