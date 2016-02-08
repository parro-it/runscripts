export default {
  test: 'xo',
  start: 'electron .',

  buildAll(pkg) {
    return [
      this.build(pkg, {platform:'linux',arch:'x64'}),
      this.build(pkg, {platform:'linux',arch:'ia32'}),
      this.build(pkg, {platform:'windows',arch:'x64'}),
      this.build(pkg, {platform:'windows',arch:'ia32'}),
      this.build(pkg, {platform:'osx',arch:'x64'}),
    ];
  },

  build: ({productName, version, electronVersion}, {platform,arch}) => [
    `electron-packager . ${productName}
      --overwrite
      --out=dist
      --ignore='^/dist$'
      --ignore='^/media$'
      --prune
      --platform=${platform}
      --arch=${arch}
      --icon=media/Icon.icns
      --app-bundle-id=com.sindresorhus.caprine
      --sign='Developer ID Application: Sindre Sorhus (YG56YK5RN5)'
      --app-version=${version}
      --version=${electronVersion}`,

      `cd dist/Caprine-${platform}-${arch}`
      `zip -ryXq9 ../Caprine-${platform}-${arch}-${version}.zip Caprine.app`
  ]
};
