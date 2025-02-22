import os
import click
from dotenv import load_dotenv
from backend.ocr_processing import process_uploads
from backend.vector_store import create_vector_store
from backend.query_gemini import GeminiQuery

@click.group()
def cli():
    """CLI for Document Processing and Querying"""
    load_dotenv()

@cli.command()
@click.option("--uploads", default="uploads", help="Uploads folder path")
@click.option("--text", default="text", help="Text output folder path")
def process(uploads, text):
    """Process PDFs from uploads folder"""
    processed = process_uploads(uploads, text)
    click.echo(f"Processed {len(processed)} files")

@cli.command()
@click.option("--text", default="text", help="Text folder path")
@click.option("--rag", default="rag", help="RAG storage folder path")
def vectorize(text, rag):
    """Create vector store from text files"""
    create_vector_store(text, rag)
    click.echo("Vector store created successfully")

@cli.command()
@click.argument("question")
@click.option("--rag", default="rag", help="RAG storage folder path")
def ask(question, rag):
    """Query the document store"""
    if not os.path.exists(rag):
        raise click.ClickException("Vector store not found. Run vectorize first.")
    
    qa = GeminiQuery(rag)
    response = qa.query(question)
    click.echo("\nResponse:")
    click.echo(response)

if __name__ == "__main__":
    cli()