const getCurrentDate = () => {
  const date = new Date();

  return `${date.getDate()}.${date.getMonth()}.${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`;
};

module.exports = {
  getCurrentDate,
};
