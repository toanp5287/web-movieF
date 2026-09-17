import movieService from "../../api/movieApi";
const getAllDataMovies = async () => {
  const data = await movieService.getAllMovies();
  return data || [];
};
