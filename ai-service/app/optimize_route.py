"""
Route optimization using OR-Tools.

For the hackathon MVP this solves: given an origin, a destination, and
optional waypoints, find the shortest ordering of waypoints to visit between
origin and destination (an open-path TSP). With zero waypoints (the
hello-world case) it just returns the straight origin->destination distance,
which still proves the OR-Tools toolchain is wired up correctly.

Distance is computed with the haversine formula (straight-line, not real
road distance) as a stand-in until real Maps API integration is wired in —
see the note in the API contract about this being the first thing to cut if
time runs short.
"""

import math
from typing import List
from pydantic import BaseModel
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp


class LatLng(BaseModel):
    lat: float
    lng: float


# Average road speed assumption for ETA estimation (km/h). Rough placeholder
# until real Maps API gives actual drive-time estimates.
ASSUMED_SPEED_KMH = 40.0

# OR-Tools works with integers, so distances are scaled up before being fed
# to the solver and scaled back down afterward.
DISTANCE_SCALE = 1000


def haversine_km(a: LatLng, b: LatLng) -> float:
    """Great-circle distance between two lat/lng points, in kilometers."""
    R = 6371.0
    lat1, lng1, lat2, lng2 = map(math.radians, [a.lat, a.lng, b.lat, b.lng])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def build_distance_matrix(points: List[LatLng]) -> List[List[int]]:
    n = len(points)
    matrix = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                matrix[i][j] = int(haversine_km(points[i], points[j]) * DISTANCE_SCALE)
    return matrix


def solve_open_path(points: List[LatLng]) -> List[int]:
    """
    Returns the optimal visiting order (as indices into `points`) for an open
    path starting at points[0] and ending at points[-1], visiting all points
    in between in the order that minimizes total distance.
    """
    n = len(points)
    if n <= 2:
        return list(range(n))

    distance_matrix = build_distance_matrix(points)

    # Fix start at index 0 and end at index n-1 by making the "return to
    # depot" arc from the last node back to start free, and disallowing the
    # reverse — simplest robust way: use start=0, end=n-1 directly, which
    # OR-Tools' RoutingIndexManager supports natively.
    manager = pywrapcp.RoutingIndexManager(n, 1, [0], [n - 1])
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    solution = routing.SolveWithParameters(search_parameters)
    if solution is None:
        # Fallback: visit in given order if the solver somehow fails
        return list(range(n))

    order = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        order.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))
    order.append(manager.IndexToNode(index))
    return order


def optimize_route(origin: LatLng, destination: LatLng, waypoints: List[LatLng]) -> dict:
    points = [origin] + waypoints + [destination]
    order = solve_open_path(points)
    ordered_points = [points[i] for i in order]

    total_km = sum(
        haversine_km(ordered_points[i], ordered_points[i + 1])
        for i in range(len(ordered_points) - 1)
    )
    eta_minutes = (total_km / ASSUMED_SPEED_KMH) * 60

    return {
        "distanceKm": round(total_km, 2),
        "etaMinutes": round(eta_minutes, 1),
        "waypoints": ordered_points,
    }
