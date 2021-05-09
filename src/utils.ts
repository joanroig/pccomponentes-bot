export default class Utils {
  // Get current date in a readable format
  static getDate() {
    var currentdate = new Date();
    var datetime =
      "# " +
      currentdate.getDate() +
      "/" +
      (currentdate.getMonth() + 1) +
      "/" +
      currentdate.getFullYear() +
      " - " +
      String(currentdate.getHours()).padStart(2, "0") +
      ":" +
      String(currentdate.getMinutes()).padStart(2, "0") +
      ":" +
      String(currentdate.getSeconds()).padStart(2, "0");
    return datetime;
  }
}
