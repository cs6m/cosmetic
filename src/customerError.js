// Shoppers only ever see this sentence. The real error stays in the console.
export function customerMessage(language) {
  return language === "ar"
    ? "عذراً، حدثت مشكلة مؤقتة أثناء تنفيذ طلبك. يرجى المحاولة مرة أخرى بعد قليل."
    : "Sorry, something went wrong while processing your request. Please try again shortly."
}

export function reportCustomerError(error, language) {
  console.error(error)
  return customerMessage(language)
}
