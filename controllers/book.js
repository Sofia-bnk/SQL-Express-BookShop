require("dotenv").config();
const sql = require("mssql");

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
