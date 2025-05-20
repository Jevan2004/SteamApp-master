// sorting.js

export const sortGamesByName = (games, sortOrder = "asc") => {
    return games.sort((a, b) =>
      sortOrder === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title)
    );
  };
  