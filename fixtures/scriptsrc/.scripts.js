export default {
  test1: `echo salve mondo`,
  test2: pkg => `echo "salve ${pkg.name}"`,
  test3: (pkg, {anArg}) => `echo "salve ${anArg}"`,

};
