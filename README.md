# OPSWAT Python File Scan Client

To use from the command line, ensure that either Python 2 or Python 3 is installed on your system. In the directory run `pip install -r requirements.txt`.

To upload a file you should run `python opswat.py sample.txt 5`. The final argument is optional (defaults to 5 seconds) and specifies the amount of time to wait between retries to fetch details of the scan. This helps to avoid going over rate limits and unnecessary reqeusts.