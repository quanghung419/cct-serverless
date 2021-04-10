const moment = require('moment');
const momentTz = require('moment-timezone');

const timezone = "Asia/Ho_Chi_Minh";
const formatDate = "YYYY/MM/DD HH:mm:ss";

module.exports = class DateUtilities {
    static convertTimezoneAndFormatDate(dateStr) {
        const date = momentTz.utc(dateStr).tz(timezone);
        return date.format(formatDate);
    }

    static convertExcelDateToUnixTimestamp(dateStr, addedMilisecond) {
        return moment(dateStr, formatDate).valueOf() + (addedMilisecond ? addedMilisecond : 0);
    }

    static convertUnixTimestampToDateStr(unixTimestamp, formatDate) {
        return momentTz.utc(unixTimestamp).tz(timezone).format(formatDate);
    }

    static convertUnixTimestampToExcelDate(unixTimestamp) {
        return momentTz.utc(unixTimestamp).tz(timezone).format(formatDate);
    }

    static formatDate = function (dateStr) {
        return moment(dateStr).format(formatDate);
    }

    static convertToVnTimestamp(dateStr) {
        return momentTz.tz(dateStr, formatDate, timezone).valueOf();
    }

    static convertToUtcTimestamp(dateStr) {
        return momentTz.utc(dateStr, formatDate).valueOf();
    }

    static getUnixTimestampFromNow(valueFromNow, unit, addedMilisecond) {
        return moment().add(valueFromNow, unit).valueOf() + (addedMilisecond ? addedMilisecond : 0);
    }

    static isTheSameDay(dateStr1, dateStr2) {
        const m1 = momentTz.tz(dateStr1, formatDate, timezone);
        const m2 = momentTz.tz(dateStr2, formatDate, timezone);
        return m1.isSame(m2.valueOf(), 'day');
    }

}