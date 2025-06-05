{
  description = "Blackout Display - Tauri App Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };
        
        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };

        buildInputs = with pkgs; [
          # Rust toolchain
          rustToolchain
          pkg-config
          
          # Node.js environment
          nodejs_20
          nodePackages.pnpm
          
          # Tauri dependencies
          openssl
          libiconv
          
          # Development tools
          direnv
          git
        ] ++ lib.optionals stdenv.isDarwin [
          # macOS specific dependencies
          darwin.apple_sdk.frameworks.CoreServices
          darwin.apple_sdk.frameworks.CoreFoundation
          darwin.apple_sdk.frameworks.Foundation
          darwin.apple_sdk.frameworks.AppKit
          darwin.apple_sdk.frameworks.WebKit
          darwin.apple_sdk.frameworks.Security
          darwin.apple_sdk.frameworks.Cocoa
        ] ++ lib.optionals stdenv.isLinux [
          # Linux specific dependencies
          gtk3
          webkitgtk
          libayatana-appindicator
          librsvg
        ];

        nativeBuildInputs = with pkgs; [
          pkg-config
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          inherit buildInputs nativeBuildInputs;
          
          shellHook = ''
            echo "Blackout Display Development Environment"
            echo "Rust: $(rustc --version)"
            echo "Node: $(node --version)"
            echo "pnpm: $(pnpm --version)"
            
            # Set up Rust environment
            export RUST_BACKTRACE=full
            export RUSTFLAGS="-C target-cpu=native"
            
            # Set up pkg-config paths for macOS
            ${if pkgs.stdenv.isDarwin then ''
              export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig:$PKG_CONFIG_PATH"
            '' else ""}
            
            # Set up library paths for Linux
            ${if pkgs.stdenv.isLinux then ''
              export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath buildInputs}:$LD_LIBRARY_PATH"
            '' else ""}
          '';
        };
      });
}