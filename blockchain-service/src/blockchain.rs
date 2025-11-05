// Temporary manual protobuf definitions until protoc is installed
// TODO: Replace with generated code from proto/blockchain.proto

use tonic::client::GrpcService;

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct MintTokenRequest {
    #[prost(string, tag = "1")]
    pub player_wallet: ::prost::alloc::string::String,
    #[prost(int32, tag = "2")]
    pub particle_x: i32,
    #[prost(int32, tag = "3")]
    pub particle_z: i32,
}

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TransferRequest {
    #[prost(string, tag = "1")]
    pub from_wallet: ::prost::alloc::string::String,
    #[prost(string, tag = "2")]
    pub to_wallet: ::prost::alloc::string::String,
    #[prost(uint64, tag = "3")]
    pub amount: u64,
}

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct BalanceRequest {
    #[prost(string, tag = "1")]
    pub player_wallet: ::prost::alloc::string::String,
}

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TokenUpdateRequest {
    #[prost(string, tag = "1")]
    pub user_id: ::prost::alloc::string::String,
    #[prost(int64, tag = "2")]
    pub amount_minted: i64,
}

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TransactionResponse {
    #[prost(bool, tag = "1")]
    pub success: bool,
    #[prost(string, tag = "2")]
    pub transaction_signature: ::prost::alloc::string::String,
    #[prost(string, tag = "3")]
    pub error_message: ::prost::alloc::string::String,
}

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct BalanceResponse {
    #[prost(uint64, tag = "1")]
    pub balance: u64,
    #[prost(string, tag = "2")]
    pub wallet_address: ::prost::alloc::string::String,
}

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Empty {}

// Simplified client for compilation - placeholder
pub mod blockchain_service_client {
    use super::*;

    #[derive(Debug, Clone)]
    pub struct BlockchainServiceClient<T> {
        _inner: T,
    }

    impl<T> BlockchainServiceClient<T> {
        pub fn new(inner: T) -> Self {
            Self { _inner: inner }
        }
    }
}

/// Generated server implementations.
pub mod blockchain_service_server {
    #![allow(unused_variables, dead_code, missing_docs, clippy::let_unit_value)]
    use tonic::codegen::*;

    #[async_trait]
    pub trait BlockchainService: Send + Sync + 'static {
        async fn mint_token_on_eat_particle(
            &self,
            request: tonic::Request<super::MintTokenRequest>,
        ) -> std::result::Result<tonic::Response<super::TransactionResponse>, tonic::Status>;
        async fn transfer_tokens(
            &self,
            request: tonic::Request<super::TransferRequest>,
        ) -> std::result::Result<tonic::Response<super::TransactionResponse>, tonic::Status>;
        async fn get_player_balance(
            &self,
            request: tonic::Request<super::BalanceRequest>,
        ) -> std::result::Result<tonic::Response<super::BalanceResponse>, tonic::Status>;
        async fn emit_token_update(
            &self,
            request: tonic::Request<super::TokenUpdateRequest>,
        ) -> std::result::Result<tonic::Response<super::Empty>, tonic::Status>;
    }

    #[derive(Debug)]
    pub struct BlockchainServiceServer<T: BlockchainService> {
        inner: Arc<T>,
        accept_compression_encodings: EnabledCompressionEncodings,
        send_compression_encodings: EnabledCompressionEncodings,
        max_decoding_message_size: Option<usize>,
        max_encoding_message_size: Option<usize>,
    }

    impl<T: BlockchainService> BlockchainServiceServer<T> {
        pub fn new(inner: T) -> Self {
            Self::from_arc(Arc::new(inner))
        }

        pub fn from_arc(inner: Arc<T>) -> Self {
            Self {
                inner,
                accept_compression_encodings: Default::default(),
                send_compression_encodings: Default::default(),
                max_decoding_message_size: None,
                max_encoding_message_size: None,
            }
        }

        pub fn accept_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.accept_compression_encodings.enable(encoding);
            self
        }

        pub fn send_compressed(mut self, encoding: CompressionEncoding) -> Self {
            self.send_compression_encodings.enable(encoding);
            self
        }

        pub fn max_decoding_message_size(mut self, limit: usize) -> Self {
            self.max_decoding_message_size = Some(limit);
            self
        }

        pub fn max_encoding_message_size(mut self, limit: usize) -> Self {
            self.max_encoding_message_size = Some(limit);
            self
        }
    }

    impl<T, B> tonic::codegen::Service<http::Request<B>> for BlockchainServiceServer<T>
    where
        T: BlockchainService,
        B: Body + Send + 'static,
        B::Error: Into<tonic::codegen::StdError> + Send + 'static,
    {
        type Response = http::Response<tonic::body::BoxBody>;
        type Error = std::convert::Infallible;
        type Future = BoxFuture<Self::Response, Self::Error>;

        fn poll_ready(
            &mut self,
            _cx: &mut std::task::Context<'_>,
        ) -> std::task::Poll<Result<(), Self::Error>> {
            std::task::Poll::Ready(Ok(()))
        }

        fn call(&mut self, req: http::Request<B>) -> Self::Future {
            match req.uri().path() {
                "/blockchain.BlockchainService/MintTokenOnEatParticle" => {
                    #[allow(non_camel_case_types)]
                    struct MintTokenOnEatParticleSvc<T: BlockchainService>(pub Arc<T>);
                    impl<
                        T: BlockchainService,
                    > tonic::server::UnaryService<super::MintTokenRequest>
                    for MintTokenOnEatParticleSvc<T> {
                        type Response = super::TransactionResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::MintTokenRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as BlockchainService>::mint_token_on_eat_particle(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = MintTokenOnEatParticleSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/blockchain.BlockchainService/TransferTokens" => {
                    #[allow(non_camel_case_types)]
                    struct TransferTokensSvc<T: BlockchainService>(pub Arc<T>);
                    impl<
                        T: BlockchainService,
                    > tonic::server::UnaryService<super::TransferRequest>
                    for TransferTokensSvc<T> {
                        type Response = super::TransactionResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::TransferRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as BlockchainService>::transfer_tokens(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = TransferTokensSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/blockchain.BlockchainService/GetPlayerBalance" => {
                    #[allow(non_camel_case_types)]
                    struct GetPlayerBalanceSvc<T: BlockchainService>(pub Arc<T>);
                    impl<
                        T: BlockchainService,
                    > tonic::server::UnaryService<super::BalanceRequest>
                    for GetPlayerBalanceSvc<T> {
                        type Response = super::BalanceResponse;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::BalanceRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as BlockchainService>::get_player_balance(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = GetPlayerBalanceSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                "/blockchain.BlockchainService/EmitTokenUpdate" => {
                    #[allow(non_camel_case_types)]
                    struct EmitTokenUpdateSvc<T: BlockchainService>(pub Arc<T>);
                    impl<
                        T: BlockchainService,
                    > tonic::server::UnaryService<super::TokenUpdateRequest>
                    for EmitTokenUpdateSvc<T> {
                        type Response = super::Empty;
                        type Future = BoxFuture<
                            tonic::Response<Self::Response>,
                            tonic::Status,
                        >;
                        fn call(
                            &mut self,
                            request: tonic::Request<super::TokenUpdateRequest>,
                        ) -> Self::Future {
                            let inner = Arc::clone(&self.0);
                            let fut = async move {
                                <T as BlockchainService>::emit_token_update(&inner, request).await
                            };
                            Box::pin(fut)
                        }
                    }
                    let accept_compression_encodings = self.accept_compression_encodings;
                    let send_compression_encodings = self.send_compression_encodings;
                    let max_decoding_message_size = self.max_decoding_message_size;
                    let max_encoding_message_size = self.max_encoding_message_size;
                    let inner = self.inner.clone();
                    let fut = async move {
                        let method = EmitTokenUpdateSvc(inner);
                        let codec = tonic::codec::ProstCodec::default();
                        let mut grpc = tonic::server::Grpc::new(codec)
                            .apply_compression_config(
                                accept_compression_encodings,
                                send_compression_encodings,
                            )
                            .apply_max_message_size_config(
                                max_decoding_message_size,
                                max_encoding_message_size,
                            );
                        let res = grpc.unary(method, req).await;
                        Ok(res)
                    };
                    Box::pin(fut)
                }
                _ => {
                    Box::pin(async move {
                        Ok(
                            http::Response::builder()
                                .status(200)
                                .header("grpc-status", tonic::Code::Unimplemented as i32)
                                .header("content-type", "application/grpc")
                                .body(empty_body())
                                .unwrap(),
                        )
                    })
                }
            }
        }
    }

    impl<T: BlockchainService> Clone for BlockchainServiceServer<T> {
        fn clone(&self) -> Self {
            let inner = Arc::clone(&self.inner);
            Self {
                inner,
                accept_compression_encodings: self.accept_compression_encodings,
                send_compression_encodings: self.send_compression_encodings,
                max_decoding_message_size: self.max_decoding_message_size,
                max_encoding_message_size: self.max_encoding_message_size,
            }
        }
    }

    impl<T: BlockchainService> tonic::server::NamedService for BlockchainServiceServer<T> {
        const NAME: &'static str = "blockchain.BlockchainService";
    }
}
