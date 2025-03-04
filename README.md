# Agent Query Script

A simple script to query the agent table from your PostgreSQL database using the connection string from your `.env` file.

## Prerequisites

- Node.js installed
- `.env` file with `POSTGRES_URL` defined

## Installation

Install the dependencies:

```bash
npm install
```

## Usage

Run the script:

```bash
npm start
```

The script will:
1. Read the `POSTGRES_URL` from your `.env` file
2. Connect to the PostgreSQL database
3. Query the first 10 records from the `Agent` table
4. Display the results in the console
5. Close the database connection

## Customizing the Query

To modify the query, edit the `query_agents.js` file and change the SQL query in the `pool.query()` function. 