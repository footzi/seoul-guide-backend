const getCurrentDate = () => {
  const date = new Date();

  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`;
};

module.exports = {
  getCurrentDate,
};
