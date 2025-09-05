import { populationClient } from './config';
import { PlacePopulation, GetPopulationRequest } from './models';

export const populationApi = {
  async getPopulation(params?: GetPopulationRequest): Promise<PlacePopulation[]> {
    const response = await populationClient.get('/population', { params });
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data.places || data;
  }
};
