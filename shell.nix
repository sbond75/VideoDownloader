{ pkgs ? import <nixpkgs> { }}:
with pkgs;

# Tip: `nix-shell -p pkgs.nodejs` an then npm commands work! npm init, npm install (on project, not global). Then do `node2nix -i node-packages.json # creates ./default.nix` and then `nix-shell # nix-shell will look for a default.nix, which above will have generated`. Original source: https://unix.stackexchange.com/questions/379842/how-to-install-npm-packages-in-nixos

let
    frameworks = pkgs.darwin.apple_sdk.frameworks; # https://stackoverflow.com/questions/51161225/how-can-i-make-macos-frameworks-available-to-clang-in-a-nix-environment
in mkShell {
  buildInputs = [ #nodePackages.browserify
                  sass
                  #nodePackages.nodemailer

                  #nodePackages.puppeteer
                  frameworks.CoreServices # Needed for `npm install grunt-browserify --save-dev` since it does `#include "CoreServices/CoreServices.h"`
                  nodejs
                  #nodePackages.grunt-cli # Grunt ( https://gruntjs.com/getting-started )
                  # Also need grunt-contrib-uglify but specifically with ES6 support (for classes) (sources: https://github.com/gruntjs/grunt-contrib-uglify/issues/482 , https://stackoverflow.com/questions/39732397/install-specific-branch-from-github-using-npm ) : use `npm install gruntjs/grunt-contrib-uglify#harmony --save`
                  # npm install grunt-contrib-htmlmin --save-dev
                  # npm install grunt-contrib-sass --save-dev
                  # npm install grunt-babel --save-dev
                  # npm install @babel/core --save
                  # npm install @babel/preset-env --save
                ];
}
