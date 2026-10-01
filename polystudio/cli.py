"""PolyStudio CLI."""
import sys
from pathlib import Path

import click

from polystudio.backends.registry import get_backend, list_backends
from polystudio.core.ast_nodes import pretty
from polystudio.core.lexer import Lexer
from polystudio.core.parser import Parser
from polystudio.version import __version__

if sys.platform == "win32":
    try:
        reconf_out = getattr(sys.stdout, "reconfigure", None)
        if callable(reconf_out):
            reconf_out(encoding="utf-8", errors="replace")
        reconf_err = getattr(sys.stderr, "reconfigure", None)
        if callable(reconf_err):
            reconf_err(encoding="utf-8", errors="replace")
    except (OSError, AttributeError):
        pass


@click.group()
@click.version_option(version=__version__)
def main():
    """PolyStudio — one DSL, five targets."""


@main.command()
@click.argument("source", type=click.Path(exists=True))
@click.option("--target", "-t", required=True,
              type=click.Choice(["tac", "sql", "dfa", "midi", "bf"]))
@click.option("--output", "-o", type=click.Path(), default=None)
@click.option("--ast", is_flag=True, help="Print AST")
def compile(source, target, output, ast):
    """Compile a .poly file."""
    src = Path(source).read_text()
    try:
        tokens = Lexer(src).tokens
        tree = Parser(tokens).parse()
    except SyntaxError as e:
        click.secho(f"❌ {e}", fg="red")
        sys.exit(1)

    if ast:
        click.echo(pretty(tree))

    try:
        backend = get_backend(target)()
        result = backend.generate(tree)
    except Exception as e:  # noqa: BLE001
        click.secho(f"❌ {target.upper()} backend: {e}", fg="red")
        sys.exit(1)

    if output:
        Path(output).write_text(result)
        click.secho(f"✅ Wrote {output}", fg="green")
    else:
        click.echo(result)


@main.command()
@click.argument("source", type=click.Path(exists=True))
def check(source):
    """Syntax-check a file."""
    src = Path(source).read_text()
    try:
        Parser(Lexer(src).tokens).parse()
        click.secho(f"✅ {source} is valid", fg="green")
    except SyntaxError as e:
        click.secho(f"❌ {e}", fg="red")
        sys.exit(1)


@main.command(name="backends")
def list_backends_cmd():
    """List available backends."""
    for b in list_backends():
        click.echo(f"  {b['id']:<8} {b['name']:<25} {b['description']}")


@main.command()
@click.option("--target", "-t", default="tac",
              type=click.Choice(["tac", "sql", "dfa", "midi", "bf"]))
def repl(target):
    """Interactive REPL."""
    click.echo(f"PolyStudio REPL (target={target}, 'exit' to quit)")
    while True:
        try:
            src = click.prompt("poly", prompt_suffix="> ")
            if src.strip() in ("exit", "quit"):
                break
            tree = Parser(Lexer(src).tokens).parse()
            click.secho(get_backend(target)().generate(tree), fg="cyan")
        except SyntaxError as e:
            click.secho(f"Error: {e}", fg="red")


if __name__ == "__main__":
    main()