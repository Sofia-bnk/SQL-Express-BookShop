const express = require("express");
const sql = require("mssql");
const app = express();
app.set("view engine", "pug");
require("dotenv").config();

const configure = {
  user: process.env.SQL_USERNAME,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: true,
    enableArithAbort: true,
  },
};

app.get("/", async (req, res) => {
  try {
    const query = `
select  ISBN13, Title, concat(Author, iif(numberOfAuthors > 1, ' m.fl.', '')), Price_kr from(
  select 
  ROW_NUMBER() OVER (PARTITION BY ISBN13, Title order by ISBN13, Title) as rownumber, 
  count(Authors.ID) over (partition by isbn13, title) as numberOfAuthors,
  ISBN13, 
  Title, 
  concat(Firstname,' ',LastName) as Author,
  Price_kr
  from Authors
  join AuthorsBooks on (AuthorsBooks.AuthorID=Authors.ID)
  join Books on (AuthorsBooks.ISBN=Books.isbn13)
  ) q where rownumber = 1`;

    await sql.connect(configure);
    const result = await sql.query(query);

    //res.json(result);
    res.render("books.pug", { books: result.recordset });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Something went wrong!");
  }
});

app.get("/books/:isbn", async (req, res) => {
  try {
    const query = `

      select  ISBN13, Title, concat(Author, iif(numberOfAuthors > 1, ' m.fl.', '')) as Author, Price_kr,[language] from(
        select 
        ROW_NUMBER() OVER (PARTITION BY ISBN13, Title order by ISBN13, Title) as rownumber, 
        count(Authors.ID) over (partition by isbn13, title) as numberOfAuthors,
        ISBN13, 
        Title, 
        concat(Firstname,' ',LastName) as Author,
        Price_kr,[language]
        from Authors
        join AuthorsBooks on (AuthorsBooks.AuthorID=Authors.ID)
        join Books on (AuthorsBooks.ISBN=Books.isbn13)
        where ISBN13 = @ISBN
        ) q where rownumber = 1
`;
    const query2 = `select bs.Name, ISNULL(convert(varchar(10),q.Total),'ej i lager') as 'In Stock' from (
  select [name], Total 
from StockBalance
join BookStores ON (StockBalance.StoreID=BookStores.ID) 
 where StockBalance.ISBN= @ISBN
) q
right join BookStores bs on bs.Name=q.name 
`;

    const connection = await sql.connect(configure);
    const result = await connection
      .request()
      .input("ISBN", sql.NVarChar, req.params.isbn)
      .query(query);
    const result2 = await connection
      .request()
      .input("ISBN", sql.NVarChar, req.params.isbn)
      .query(query2);

    //res.json(result.recordset[0]);
    if (result.recordset && result.recordset.length > 0 && result2.recordset) {
      res.render("book.pug", {
        book: result.recordset[0],
        stores: result2.recordset,
      });
    } else {
      res.status(404).send("The book is not found!");
    }
    //res.json(result2);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Something went wrong!");
  }
});

app.listen(3000, () => {
  console.log("Listening to port!");
});
