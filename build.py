"""Build the backend from a temporary path when the checkout name is incompatible with Java tools."""

from pathlib import Path
import glob
import shutil
import subprocess
import sys
import tempfile


def find_maven():
    installed = shutil.which("mvn")
    if installed:
        return installed
    cached = glob.glob(str(Path.home() / ".m2/wrapper/dists/**/bin/mvn.cmd"), recursive=True)
    return next(iter(sorted(cached)), None)


def main():
    source = Path(__file__).resolve().parent
    maven = find_maven()
    if not maven:
        raise SystemExit("Use the Maven Wrapper from a normal checkout path, or install Maven 3.9.11.")
    with tempfile.TemporaryDirectory(prefix="fincore-build-") as stage:
        # Frontend dependencies, credentials, and editor state are not backend build inputs.
        for name in ("pom.xml", "src", ".mvn"):
            candidate = source / name
            if candidate.is_dir():
                shutil.copytree(candidate, Path(stage) / name)
            elif candidate.is_file():
                shutil.copy2(candidate, Path(stage) / name)
        result = subprocess.run([maven, "-B", *(sys.argv[1:] or ["verify"])], cwd=stage, check=False)
        artifacts = Path(stage) / "target"
        if artifacts.exists():
            shutil.copytree(artifacts, source / "target", dirs_exist_ok=True)
        return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
