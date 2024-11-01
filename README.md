# NEAT (NeuroEvolution of Augmenting Topologies) 
NEAT (NeuroEvolution of Augmenting Topologies) 
là một thuật toán AI kết hợp học sâu với tiến hóa, đặc biệt dành cho tối ưu hóa cấu trúc và trọng số của mạng neuron. NEAT không sử dụng một kiến trúc cố định như CNN (Convolutional Neural Network) hay RNN (Recurrent Neural Network) mà thay vào đó phát triển kiến trúc mạng neuron thông qua quá trình tiến hóa. NEAT áp dụng các ý tưởng tiến hóa sinh học để tối ưu hóa mạng neuron bằng cách:

- Thay đổi cấu trúc: Thay vì chỉ điều chỉnh trọng số, NEAT có thể thêm hoặc xóa các neuron và kết nối giữa chúng, giúp mạng có khả năng mở rộng và tìm ra kiến trúc phù hợp nhất.

- Tiến hóa cấu trúc và trọng số đồng thời: NEAT sử dụng thuật toán di truyền để tìm ra cả cấu trúc mạng và trọng số tối ưu cùng lúc, thay vì giữ cố định cấu trúc mạng và chỉ tối ưu trọng số.

- Cải tiến dần: Mạng neuron bắt đầu với các cấu trúc đơn giản và tiến hóa dần thành cấu trúc phức tạp hơn khi cần thiết, tối ưu hóa theo yêu cầu cụ thể của bài toán.

NEAT phù hợp cho các ứng dụng cần khám phá hoặc phát triển kiến trúc mạng tối ưu từ đầu mà không yêu cầu kiến trúc cố định ban đầu, đặc biệt là trong các môi trường học tăng cường (reinforcement learning) như điều khiển robot, trò chơi, hoặc các hệ thống tự động hoá phức tạp.

## Các thành phần cơ bản của mạng NEAT
    1. Node: Đại diện cho một node (nút) trong neural network.
    2. Connection: Đại diện cho một connection (kết nối) giữa các node.
    3. Genome: Chứa các node và connection, thể hiện như một genome của mạng neural.
    4. Network: Tạo và thực thi một mạng neural từ một genome.
    5. Neat: Điều khiển quá trình tiến hóa và chọn lọc các genome.

## Hiệu quả tiến hóa
Để cải tiến hệ thống NEAT, chúng ta có thể thêm các thuật toán đột biến (mutate), chọn lọc (selection), và lai tạo (crossover) phức tạp hơn. Dưới đây là một số cách nâng cao các chức năng này nhằm đạt hiệu quả tiến hóa tốt hơn:

    - Mutation: Bổ sung các loại đột biến như thêm node, thêm kết nối, thay đổi trọng số với các xác suất khác nhau.
    - Selection: Sử dụng phương pháp roulette selection hoặc tournament selection để chọn các genome tốt nhất từ quần thể.
    - Crossover: Lai tạo các genome bằng cách chọn lọc các gene từ cha và mẹ, ưu tiên gene trội, và bổ sung các gene độc nhất.

