import api from "./api";
const movieService = {
  getAllMovies() {
    return api.get("/movies");
  },
};
export default movieService;
